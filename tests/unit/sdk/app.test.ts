import { describe, expect, it, vi } from 'vitest'
import { createSynthwerkApp, type GetToken } from '../../../packages/sdk/src/index.ts'
import { appId, fakeEdge } from '../../support/fake-edge.ts'
import { jwt } from '../../support/fake-fetch.ts'

const image = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
const alice = jwt({ sub: 'alice' })
const bob = jwt({ sub: 'bob' })

function app(getToken: GetToken, withAppId = true) {
  const edge = fakeEdge()
  return {
    edge,
    app: createSynthwerkApp({
      apiUrl: 'https://api.test',
      getToken,
      fetch: edge.fetch,
      ...(withAppId ? { appId } : {})
    })
  }
}

describe('createSynthwerkApp', () => {
  it('create - no getToken call, status unknown (SSR safe)', () => {
    const getToken = vi.fn(() => alice)
    const { app: a } = app(getToken)
    a.connect()
    expect(getToken).not.toHaveBeenCalled()
    expect(a.auth.getSnapshot()).toEqual({ status: 'unknown', user: null })
  })

  it('checkAuth - checking, then signed_in with the subject', async () => {
    const { app: a } = app(() => alice)
    const seen: string[] = []
    a.auth.subscribe(() => seen.push(a.auth.getSnapshot().status))
    const user = await a.checkAuth()
    expect(user?.subject).toBe('alice')
    expect(seen).toEqual(['checking', 'signed_in'])
  })

  it('getToken throws or returns null - signed_out', async () => {
    const { app: a } = app(() => {
      throw new Error('no session')
    })
    await a.checkAuth()
    expect(a.auth.getSnapshot().status).toBe('signed_out')
    const { app: b } = app(() => null)
    await b.checkAuth()
    expect(b.auth.getSnapshot().status).toBe('signed_out')
  })

  it('user switch - drops the widget token and tells listeners; first sign-in does not', async () => {
    let token = alice
    const { app: a, edge } = app(() => token)
    a.connect()
    const dropped = vi.fn()
    a.onUserChange(dropped)
    await a.checkAuth()
    expect(dropped).not.toHaveBeenCalled()
    await a.widget()?.sw.api.vision.POST('/v1/classifications', { body: { image } })
    token = bob
    // Any request with the new token shows the new subject.
    await a.sw.api.llm.POST('/v1/conversations', { body: {} })
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(a.auth.getSnapshot().user?.subject).toBe('bob')
    await a.widget()?.sw.api.vision.POST('/v1/classifications', { body: { image } })
    const trades = edge.calls.filter((r) => r.url.endsWith('/widget-tokens'))
    expect(trades.map((r) => r.headers.get('authorization'))).toEqual([
      `Bearer ${alice}`,
      `Bearer ${bob}`
    ])
  })

  it('signOut - signed_out, listeners told, calls fail until checkAuth', async () => {
    const { app: a } = app(() => alice)
    await a.checkAuth()
    const dropped = vi.fn()
    a.onUserChange(dropped)
    a.signOut()
    expect(a.auth.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    expect(dropped).toHaveBeenCalled()
    await expect(a.sw.api.llm.POST('/v1/conversations', { body: {} })).rejects.toMatchObject({
      code: 'unauthenticated'
    })
    await a.checkAuth()
    expect(a.auth.getSnapshot().status).toBe('signed_in')
  })

  it('sessionChanged - drops user data, then checks again', async () => {
    const { app: a } = app(() => alice)
    await a.checkAuth()
    const dropped = vi.fn()
    a.onUserChange(dropped)
    await a.sessionChanged()
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(a.auth.getSnapshot().status).toBe('signed_in')
  })

  it('no appId - widget() is null', () => {
    expect(app(() => alice, false).app.widget()).toBeNull()
  })

  it('connect twice, stop both - stops following auth changes', async () => {
    let token: string | null = alice
    const { app: a } = app(() => token)
    const stopA = a.connect()
    const stopB = a.connect()
    await a.checkAuth()
    stopA()
    stopA()
    stopB()
    token = null
    await a.sw.api.llm.POST('/v1/conversations', { body: {} }).catch(() => undefined)
    // Not followed any more: the snapshot keeps the old user.
    expect(a.auth.getSnapshot().user?.subject).toBe('alice')
  })
})
