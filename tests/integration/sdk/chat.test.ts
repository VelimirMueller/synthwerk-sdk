// Integration: the real SDK over real HTTP against the Node mock gateway.
import { afterEach, describe, expect, it } from 'vitest'
import { type ChatEvent, createSynthwerk, type GetToken } from '../../../packages/sdk/src/index.ts'
import { collect } from '../../support/fake-fetch.ts'
import {
  answer,
  type Handler,
  type MockGateway,
  problem,
  startMockGateway
} from '../../support/mock-gateway.ts'

const conversationId = '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f'
let gateway: MockGateway | undefined

afterEach(async () => {
  await gateway?.close()
  gateway = undefined
})

async function setup(handler: Handler, getToken: GetToken = () => 'tok') {
  gateway = await startMockGateway(handler)
  const sw = createSynthwerk({ apiUrl: gateway.url, auth: { mode: 'token', getToken } })
  return { gw: gateway, sw }
}

function text(events: ChatEvent[]): string {
  return events.map((e) => (e.type === 'delta' ? e.text : '')).join('')
}

describe('chat against the mock gateway', () => {
  it('chat - mock gateway streams 20 tokens then done - text equals joined tokens', async () => {
    const tokens = Array.from({ length: 20 }, (_, i) => `t${i} `)
    const { gw, sw } = await setup(() => answer(tokens))
    const events = await collect(sw.llm.chat({ conversationId, content: 'Hi' }))
    expect(text(events)).toBe(tokens.join(''))
    expect(events.at(-1)).toMatchObject({ type: 'done', finishReason: 'stop' })
    expect(gw.requests[0]).toMatchObject({
      method: 'POST',
      path: `/llm/v1/conversations/${conversationId}/messages`
    })
    expect(gw.requests[0]?.headers.authorization).toBe('Bearer tok')
    expect(JSON.parse(gw.requests[0]?.body ?? '')).toEqual({ content: 'Hi' })
  })

  it('chat - 401 then new token - request retried once', async () => {
    const { gw, sw } = await setup(
      (req) =>
        req.headers.authorization === 'Bearer new'
          ? answer(['ok'])
          : problem(401, 'unauthenticated'),
      ({ refresh }) => (refresh ? 'new' : 'old')
    )
    const events = await collect(sw.llm.chat({ conversationId, content: 'Hi' }))
    expect(text(events)).toBe('ok')
    expect(gw.requests).toHaveLength(2)
    expect(gw.requests[1]?.body).toBe(gw.requests[0]?.body)
  })

  it('chat - gateway sends error event after 3 tokens - 3 tokens then error, no retry', async () => {
    const { gw, sw } = await setup(() => ({
      kind: 'stream',
      steps: [
        ...['a', 'b', 'c'].map((t) => ({
          kind: 'event' as const,
          event: { event: 'delta', data: { text: t } }
        })),
        { kind: 'ping' },
        {
          kind: 'event',
          event: {
            event: 'error',
            data: {
              type: 'https://schemas.synthwerk.dev/problems/model_unavailable',
              title: 'Model unavailable',
              status: 503,
              code: 'model_unavailable'
            }
          }
        }
      ]
    }))
    const events = await collect(sw.llm.chat({ conversationId, content: 'Hi' }))
    expect(events.map((e) => e.type)).toEqual(['delta', 'delta', 'delta', 'error'])
    expect(events[3]).toMatchObject({ error: { code: 'model_unavailable', status: 503 } })
    expect(gw.requests).toHaveLength(1)
  })

  it('chat - 429 quota_exhausted - throws before any event', async () => {
    const { sw } = await setup(() => ({
      kind: 'problem',
      status: 429,
      code: 'quota_exhausted',
      headers: { 'retry-after': '120' }
    }))
    await expect(collect(sw.llm.chat({ conversationId, content: 'Hi' }))).rejects.toMatchObject({
      code: 'quota_exhausted',
      retryAfter: 120
    })
  })

  it('chat - connection dropped mid-stream - error event, partial text kept', async () => {
    const { sw } = await setup(() => ({
      kind: 'stream',
      steps: [
        { kind: 'event', event: { event: 'delta', data: { text: 'part' } } },
        { kind: 'drop' }
      ]
    }))
    const events = await collect(sw.llm.chat({ conversationId, content: 'Hi' }))
    expect(text(events)).toBe('part')
    expect(events.at(-1)?.type).toBe('error')
    const last = events.at(-1)
    expect(last?.type === 'error' && last.error.retryable).toBe(true)
  })

  it('chat - abort mid-stream - server sees the connection close', async () => {
    const { gw, sw } = await setup(() => ({
      kind: 'stream',
      steps: [
        { kind: 'event', event: { event: 'delta', data: { text: 'a' } } },
        { kind: 'wait', ms: 5_000 },
        { kind: 'event', event: { event: 'delta', data: { text: 'never' } } }
      ]
    }))
    const controller = new AbortController()
    const events: ChatEvent[] = []
    for await (const event of sw.llm.chat(
      { conversationId, content: 'Hi' },
      { signal: controller.signal }
    )) {
      events.push(event)
      controller.abort()
    }
    expect(text(events)).toBe('a')
    await gw.closed
  })

  it('chat - gateway down - throws network', async () => {
    const { gw, sw } = await setup(() => answer(['x']))
    await gw.close()
    gateway = undefined
    await expect(collect(sw.llm.chat({ conversationId, content: 'Hi' }))).rejects.toMatchObject({
      code: 'network'
    })
  })

  it('api - create conversation, then chat - one flow over the typed client', async () => {
    const { gw, sw } = await setup((req) =>
      req.path === '/llm/v1/conversations'
        ? {
            kind: 'json',
            status: 201,
            body: {
              id: conversationId,
              model: 'default',
              created_at: '2026-10-23T09:00:00Z',
              messages: []
            }
          }
        : answer(['hello'])
    )
    const { data } = await sw.api.llm.POST('/v1/conversations', { body: {} })
    expect(data?.id).toBe(conversationId)
    const events = await collect(sw.llm.chat({ conversationId: data?.id ?? '', content: 'Hi' }))
    expect(text(events)).toBe('hello')
    expect(gw.requests.map((r) => r.path)).toEqual([
      '/llm/v1/conversations',
      `/llm/v1/conversations/${conversationId}/messages`
    ])
  })
})
