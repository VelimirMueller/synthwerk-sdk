import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  type ChatEvent,
  createSynthwerk,
  type GetToken,
  type Synthwerk
} from '../../../packages/sdk/src/index.ts'
import { readSse } from '../../../packages/sdk/src/llm/sse.ts'
import {
  collect,
  fakeFetch,
  problemResponse,
  sseBody,
  sseResponse
} from '../../support/fake-fetch.ts'

const conversationId = '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f'

function client(
  fetch: (r: Request) => Promise<Response>,
  getToken: GetToken = () => 't'
): Synthwerk {
  return createSynthwerk({ apiUrl: 'https://api.test/', auth: { mode: 'token', getToken }, fetch })
}

const delta = (text: string, id = 1) =>
  `id: m:${id}\nevent: delta\ndata: ${JSON.stringify({ text })}\n\n`
const done = 'event: done\ndata: {"message_id":"m","finish_reason":"stop"}\n\n'

describe('readSse', () => {
  it('parseSse - event split across two chunks - one event', async () => {
    const body = sseBody()
    const frames = collect(readSse(body.stream, { stallTimeoutMs: 1000 }))
    body.write('event: del')
    body.write('ta\ndata: {"text":"hi"}\n')
    body.write('\n')
    body.end()
    expect(await frames).toEqual([{ event: 'delta', id: undefined, data: '{"text":"hi"}' }])
  })

  it('parseSse - multi-byte UTF-8 split across chunks - text intact', async () => {
    const bytes = new TextEncoder().encode(delta('Grüße 👋'))
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (const b of bytes) c.enqueue(new Uint8Array([b]))
        c.close()
      }
    })
    const [frame] = await collect(readSse(stream, { stallTimeoutMs: 1000 }))
    expect(JSON.parse(frame?.data ?? '').text).toBe('Grüße 👋')
  })
})

describe('chat', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('chat - request - POST to the llm route with SSE accept and the bearer token', async () => {
    const fetch = fakeFetch(() => sseResponse(delta('a') + done))
    await collect(client(fetch).llm.chat({ conversationId, content: 'Hi', model: 'default' }))
    const [req] = fetch.calls
    expect(req?.method).toBe('POST')
    expect(req?.url).toBe(`https://api.test/llm/v1/conversations/${conversationId}/messages`)
    expect(req?.headers.get('accept')).toBe('text/event-stream')
    expect(req?.headers.get('authorization')).toBe('Bearer t')
    expect(req?.headers.get('traceparent')).toBeNull()
    expect(await req?.json()).toEqual({ content: 'Hi', model: 'default' })
  })

  it('chat - delta, usage, done - typed events in order', async () => {
    const usage = 'event: usage\ndata: {"input_tokens":4,"output_tokens":2,"model":"default"}\n\n'
    const fetch = fakeFetch(() => sseResponse(delta('Hel', 1) + delta('lo', 2) + usage + done))
    const events = await collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    expect(events).toEqual([
      { type: 'delta', id: 'm:1', text: 'Hel' },
      { type: 'delta', id: 'm:2', text: 'lo' },
      {
        type: 'usage',
        id: undefined,
        usage: { input_tokens: 4, output_tokens: 2, model: 'default' }
      },
      { type: 'done', id: undefined, messageId: 'm', finishReason: 'stop' }
    ])
  })

  it('chat - heartbeat comment only - no events, stream stays open', async () => {
    const body = sseBody()
    const fetch = fakeFetch(() => sseResponse(body.stream))
    const iterator = client(fetch)
      .llm.chat({ conversationId, content: 'x' })
      [Symbol.asyncIterator]()
    const next = iterator.next()
    let settled = false
    void next.then(() => {
      settled = true
    })
    body.write(': ping\n\n')
    body.write(': ping\n\n')
    await new Promise((r) => setTimeout(r, 20))
    expect(settled).toBe(false)
    expect(body.cancelled).toBe(false)
    body.write(delta('ok'))
    expect((await next).value).toMatchObject({ type: 'delta', text: 'ok' })
    await iterator.return?.()
  })

  it('chat - unknown event name - ignored, later events delivered', async () => {
    const fetch = fakeFetch(() =>
      sseResponse(`event: tool_call\ndata: {"name":"x"}\n\n${delta('after')}${done}`)
    )
    const events = await collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    expect(events.map((e) => e.type)).toEqual(['delta', 'done'])
  })

  it('chat - malformed JSON data - error event invalid_event, stream ends', async () => {
    const fetch = fakeFetch(() => sseResponse(`event: delta\ndata: {nope\n\n${delta('never')}`))
    const events = await collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'error', error: { code: 'invalid_event' } })
  })

  it('chat - error event after tokens - tokens then error, iteration ends', async () => {
    const error =
      'event: error\ndata: {"type":"https://schemas.synthwerk.dev/problems/model_unavailable","title":"Model unavailable","status":503,"code":"model_unavailable"}\n\n'
    const fetch = fakeFetch(() => sseResponse(delta('a') + error + delta('b')))
    const events = await collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    expect(events.map((e) => e.type)).toEqual(['delta', 'error'])
    expect(events[1]).toMatchObject({ error: { code: 'model_unavailable', retryable: true } })
    expect(fetch.calls).toHaveLength(1)
  })

  it('chat - abort mid-stream - iteration ends, fetch aborted', async () => {
    const body = sseBody()
    const fetch = fakeFetch(() => sseResponse(body.stream))
    const controller = new AbortController()
    const seen: ChatEvent[] = []
    body.write(delta('one'))
    for await (const event of client(fetch).llm.chat(
      { conversationId, content: 'x' },
      { signal: controller.signal }
    )) {
      seen.push(event)
      controller.abort()
    }
    expect(seen.map((e) => e.type)).toEqual(['delta'])
    expect(fetch.calls[0]?.signal.aborted).toBe(true)
    expect(body.cancelled).toBe(true)
  })

  it('chat - break out of for await - fetch aborted', async () => {
    const body = sseBody()
    const fetch = fakeFetch(() => sseResponse(body.stream))
    body.write(delta('one'))
    for await (const _ of client(fetch).llm.chat({ conversationId, content: 'x' })) break
    expect(fetch.calls[0]?.signal.aborted).toBe(true)
  })

  it('chat - signal aborted before start - no events, fetch not called', async () => {
    const fetch = fakeFetch(() => sseResponse(done))
    const events = await collect(
      client(fetch).llm.chat({ conversationId, content: 'x' }, { signal: AbortSignal.abort() })
    )
    expect(events).toEqual([])
    expect(fetch.calls).toHaveLength(0)
  })

  it('chat - no bytes for 45 s (fake timers) - error event stream_stalled', async () => {
    vi.useFakeTimers()
    const body = sseBody()
    const fetch = fakeFetch(() => sseResponse(body.stream))
    const iterator = client(fetch)
      .llm.chat({ conversationId, content: 'x' })
      [Symbol.asyncIterator]()
    body.write(delta('a'))
    expect((await iterator.next()).value).toMatchObject({ type: 'delta' })
    const next = iterator.next()
    await vi.advanceTimersByTimeAsync(44_000)
    body.write(': ping\n\n')
    await vi.advanceTimersByTimeAsync(44_000)
    await vi.advanceTimersByTimeAsync(1_001)
    expect((await next).value).toMatchObject({ type: 'error', error: { code: 'stream_stalled' } })
    expect((await iterator.next()).done).toBe(true)
    expect(body.cancelled).toBe(true)
  })

  it('chat - connection drops without done - error event stream_interrupted', async () => {
    const fetch = fakeFetch(() => sseResponse(delta('a')))
    const events = await collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: { code: 'stream_interrupted', retryable: true }
    })
  })

  it('chat - body read fails mid-stream - error event network', async () => {
    const body = sseBody()
    const fetch = fakeFetch(() => sseResponse(body.stream))
    body.write(delta('a'))
    const events: ChatEvent[] = []
    for await (const event of client(fetch).llm.chat({ conversationId, content: 'x' })) {
      events.push(event)
      if (event.type === 'delta') body.fail(new TypeError('terminated'))
    }
    expect(events.at(-1)).toMatchObject({ type: 'error', error: { code: 'network' } })
  })

  it('chat - no token - throws unauthenticated, fetch not called', async () => {
    const fetch = fakeFetch(() => sseResponse(done))
    await expect(
      collect(client(fetch, () => null).llm.chat({ conversationId, content: 'x' }))
    ).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(fetch.calls).toHaveLength(0)
  })

  it('chat - 429 quota_exhausted before the first byte - throws with retryAfter', async () => {
    const fetch = fakeFetch(() => problemResponse(429, 'quota_exhausted', { 'retry-after': '60' }))
    await expect(
      collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    ).rejects.toMatchObject({
      code: 'quota_exhausted',
      status: 429,
      retryAfter: 60,
      retryable: false
    })
  })

  it('chat - fetch rejects - throws network', async () => {
    const fetch = fakeFetch(() => Promise.reject(new TypeError('fetch failed')))
    await expect(
      collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    ).rejects.toMatchObject({ code: 'network' })
  })

  it('chat - 200 with JSON instead of SSE - throws bad_gateway', async () => {
    const fetch = fakeFetch(() => Response.json({ ok: true }))
    await expect(
      collect(client(fetch).llm.chat({ conversationId, content: 'x' }))
    ).rejects.toMatchObject({ code: 'bad_gateway' })
  })

  it('chat - 401 then new token - request retried once with the new token', async () => {
    const getToken = vi.fn(({ refresh }: { refresh: boolean }) => (refresh ? 'new' : 'old'))
    const fetch = fakeFetch((req) =>
      req.headers.get('authorization') === 'Bearer new'
        ? sseResponse(delta('a') + done)
        : problemResponse(401, 'unauthenticated')
    )
    const events = await collect(client(fetch, getToken).llm.chat({ conversationId, content: 'x' }))
    expect(events.map((e) => e.type)).toEqual(['delta', 'done'])
    expect(fetch.calls).toHaveLength(2)
    expect(await fetch.calls[1]?.json()).toEqual({ content: 'x' })
  })

  it('types - ChatEvent narrows on type; api rejects unknown paths', () => {
    const event = { type: 'delta', id: undefined, text: 'x' } as ChatEvent
    if (event.type === 'delta') expectTypeOf(event.text).toEqualTypeOf<string>()
    if (event.type === 'done') expectTypeOf(event.finishReason).toEqualTypeOf<'stop' | 'length'>()
    if (event.type === 'error') expectTypeOf(event.error.code).toBeString()
    const sw = client(fakeFetch(() => Response.json({})))
    // @ts-expect-error unknown path
    void (() => sw.api.llm.GET('/v1/unknown'))
    // @ts-expect-error the send route is POST only
    void (() => sw.api.llm.GET('/v1/conversations/{id}/messages'))
    expectTypeOf(sw.api.identity.GET).toBeFunction()
  })
})
