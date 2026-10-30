import { describe, expect, it, vi } from 'vitest'
import {
  createChatStore,
  createSynthwerk,
  type Synthwerk
} from '../../../packages/sdk/src/index.ts'
import { conversationId, delta, done, fakeEdge, tick, usage } from '../../support/fake-edge.ts'
import { problemResponse } from '../../support/fake-fetch.ts'

function setup() {
  const edge = fakeEdge()
  const sw: Synthwerk = createSynthwerk({
    apiUrl: 'https://api.test',
    auth: { mode: 'token', getToken: () => 't' },
    fetch: edge.fetch
  })
  return { edge, sw }
}

async function untilStream(edge: ReturnType<typeof fakeEdge>, n = 1) {
  for (let i = 0; i < 50 && edge.streams.length < n; i++) await tick()
  const stream = edge.streams[n - 1]
  if (!stream) throw new Error('no stream')
  return stream
}

describe('createChatStore', () => {
  it('send - tokens arrive one by one in the assistant message, then done', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    const texts: string[] = []
    store.subscribe(() => {
      const last = store.getSnapshot().messages.at(-1)
      if (last?.role === 'assistant') texts.push(last.text)
    })
    const sent = store.send('  Hi  ')
    const stream = await untilStream(edge)
    expect(store.getSnapshot().streaming).toBe(true)
    stream.write(delta('Hel'))
    await tick()
    expect(store.getSnapshot().messages.at(-1)?.text).toBe('Hel')
    stream.write(delta('lo', 2) + usage + done)
    await sent
    const snap = store.getSnapshot()
    expect(snap.conversationId).toBe(conversationId)
    expect(snap.streaming).toBe(false)
    expect(snap.usage?.output_tokens).toBe(2)
    expect(snap.messages.map((m) => [m.role, m.text, m.status])).toEqual([
      ['user', 'Hi', 'done'],
      ['assistant', 'Hello', 'done']
    ])
    expect(texts).toContain('Hel')
    // The second send reuses the conversation.
    const again = store.send('more')
    ;(await untilStream(edge, 2)).write(delta('ok') + done)
    await again
    expect(edge.calls.filter((r) => r.url.endsWith('/v1/conversations'))).toHaveLength(1)
  })

  it('quota before the stream - error quota, message back to failedText', async () => {
    const { edge, sw } = setup()
    edge.routes.push((r) =>
      r.url.endsWith('/messages')
        ? problemResponse(429, 'quota_exhausted', { 'retry-after': '60' })
        : undefined
    )
    const store = createChatStore({ sw }, { now: () => 0 })
    await store.send('Hi')
    const snap = store.getSnapshot()
    expect(snap.error).toMatchObject({ kind: 'quota', code: 'quota_exhausted' })
    expect(snap.error?.resetsAt?.getTime()).toBe(60_000)
    expect(snap.messages).toEqual([])
    expect(snap.failedText).toBe('Hi')
    store.dismiss()
    expect(store.getSnapshot().error).toBeNull()
  })

  it('conversation create 403 - not_allowed (origin) error', async () => {
    const { edge, sw } = setup()
    edge.routes.push((r) =>
      r.url.endsWith('/v1/conversations') ? problemResponse(403, 'forbidden') : undefined
    )
    const store = createChatStore({ sw })
    await store.send('Hi')
    expect(store.getSnapshot().error?.kind).toBe('not_allowed')
  })

  it('error event mid stream - partial answer kept with status error', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    const sent = store.send('Hi')
    const stream = await untilStream(edge)
    stream.write(
      `${delta('par')}event: error\ndata: ${JSON.stringify({ code: 'model_unavailable', title: 'x', status: 503 })}\n\n`
    )
    await sent
    const snap = store.getSnapshot()
    expect(snap.messages.at(-1)).toMatchObject({ text: 'par', status: 'error' })
    expect(snap.error?.kind).toBe('busy')
    expect(snap.failedText).toBeNull()
  })

  it('stop - aborts the stream, partial answer stopped', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    const sent = store.send('Hi')
    const stream = await untilStream(edge)
    stream.write(delta('par'))
    await tick()
    store.stop()
    await sent
    expect(store.getSnapshot().messages.at(-1)).toMatchObject({ text: 'par', status: 'stopped' })
    expect(store.getSnapshot().error).toBeNull()
    expect(edge.calls.at(-1)?.signal.aborted).toBe(true)
  })

  it('stale send - stopped, then a new send - streaming stays with the new send', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    const first = store.send('one')
    await untilStream(edge)
    store.stop()
    await first
    const second = store.send('two')
    const stream = await untilStream(edge, 2)
    expect(store.getSnapshot().streaming).toBe(true)
    stream.write(delta('ok') + done)
    await second
    expect(store.getSnapshot().streaming).toBe(false)
  })

  it('done without text - empty bubble dropped, generic empty_answer error', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    const sent = store.send('Hi')
    ;(await untilStream(edge)).write(done)
    await sent
    expect(store.getSnapshot().messages.map((m) => m.role)).toEqual(['user'])
    expect(store.getSnapshot().error).toMatchObject({ kind: 'generic', code: 'empty_answer' })
  })

  it('blank text or send while streaming - ignored', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw })
    await store.send('   ')
    expect(edge.calls).toHaveLength(0)
    const sent = store.send('Hi')
    await store.send('again')
    ;(await untilStream(edge)).write(delta('a') + done)
    await sent
    expect(store.getSnapshot().messages).toHaveLength(2)
  })

  it('user change during a stream - chat cleared, the old stream never writes again', async () => {
    const { edge, sw } = setup()
    let fire!: () => void
    const store = createChatStore({
      sw,
      onUserChange: (listener) => {
        fire = listener
        return () => undefined
      }
    })
    const disconnect = store.connect()
    const sent = store.send('Hi')
    const stream = await untilStream(edge)
    stream.write(delta('secret'))
    await tick()
    fire()
    await sent
    expect(store.getSnapshot()).toMatchObject({
      conversationId: null,
      messages: [],
      streaming: false
    })
    disconnect()
  })

  it('connect, then disconnect (unmount) - aborts the open stream', async () => {
    const { edge, sw } = setup()
    const unsubscribe = vi.fn()
    const store = createChatStore({ sw, onUserChange: () => unsubscribe })
    const disconnect = store.connect()
    const sent = store.send('Hi')
    await untilStream(edge)
    disconnect()
    await sent
    expect(unsubscribe).toHaveBeenCalled()
    expect(edge.calls.at(-1)?.signal.aborted).toBe(true)
  })

  it('conversationId option - no create call', async () => {
    const { edge, sw } = setup()
    const store = createChatStore({ sw }, { conversationId: 'c-1' })
    const sent = store.send('Hi')
    ;(await untilStream(edge)).write(delta('a') + done)
    await sent
    expect(edge.calls.map((r) => new URL(r.url).pathname)).toEqual([
      '/llm/v1/conversations/c-1/messages'
    ])
  })
})
