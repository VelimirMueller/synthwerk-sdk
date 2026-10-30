import { describe, expect, it } from 'vitest'
import { createClassifyStore, createWidgetSession } from '../../../packages/sdk/src/index.ts'
import { appId, fakeEdge } from '../../support/fake-edge.ts'

const image = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })

function setup() {
  const edge = fakeEdge()
  const session = createWidgetSession({
    apiUrl: 'https://api.test',
    appId,
    getUserToken: () => 'user',
    fetch: edge.fetch
  })
  return { edge, session }
}

describe('createClassifyStore', () => {
  it('classify - pending, then success with the classification', async () => {
    const { session } = setup()
    const store = createClassifyStore({ widget: () => session })
    const result = store.classify(image)
    expect(store.getSnapshot().status).toBe('pending')
    expect((await result)?.primary.label).toBe('hut')
    expect(store.getSnapshot()).toMatchObject({ status: 'success', error: null })
    store.reset()
    expect(store.getSnapshot()).toEqual({ status: 'idle', data: null, error: null })
  })

  it('403 wrong origin (FastAPI body) - error not_allowed', async () => {
    const { edge, session } = setup()
    edge.routes.push((r) =>
      r.url.endsWith('/v1/classifications')
        ? Response.json({ detail: 'origin' }, { status: 403 })
        : undefined
    )
    const store = createClassifyStore({ widget: () => session })
    expect(await store.classify(image)).toBeNull()
    expect(store.getSnapshot()).toMatchObject({ status: 'error', error: { kind: 'not_allowed' } })
  })

  it('no app id - error state, never rejects', async () => {
    const store = createClassifyStore({ widget: () => null })
    expect(await store.classify(image)).toBeNull()
    expect(store.getSnapshot().status).toBe('error')
  })

  it('second call - first is aborted, latest wins', async () => {
    const { edge, session } = setup()
    const store = createClassifyStore({ widget: () => session })
    const first = store.classify(image)
    const second = store.classify(image)
    expect(await first).toBeNull()
    expect(await second).not.toBeNull()
    expect(store.getSnapshot().status).toBe('success')
    const calls = edge.calls.filter((r) => r.url.endsWith('/v1/classifications'))
    expect(calls.map((r) => r.signal.aborted)).toEqual([true, false])
  })

  it('disconnect while pending - aborted, back to idle; user change resets', async () => {
    const { session } = setup()
    let fire!: () => void
    const store = createClassifyStore({
      widget: () => session,
      onUserChange: (l) => {
        fire = l
        return () => undefined
      }
    })
    const stop = store.connect()
    await store.classify(image)
    fire()
    expect(store.getSnapshot().status).toBe('idle')
    const pending = store.classify(image)
    stop()
    expect(await pending).toBeNull()
    expect(store.getSnapshot().status).toBe('idle')
  })
})
