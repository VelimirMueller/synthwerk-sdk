import { describe, expect, it } from 'vitest'
import { createWidgetSession, type GetUserToken } from '../../../packages/sdk/src/index.ts'
import { appId, fakeEdge, tick } from '../../support/fake-edge.ts'

const image = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })

function session(getUserToken: GetUserToken, edge = fakeEdge(), now = () => 0) {
  return {
    edge,
    ...createWidgetSession({
      apiUrl: 'https://api.test/',
      appId,
      getUserToken,
      fetch: edge.fetch,
      now
    })
  }
}

const trades = (edge: ReturnType<typeof fakeEdge>) =>
  edge.calls.filter((r) => r.url.endsWith('/widget-tokens'))
const bearer = (edge: ReturnType<typeof fakeEdge>, path: string) =>
  edge.calls.filter((r) => r.url.endsWith(path)).map((r) => r.headers.get('authorization'))

describe('createWidgetSession', () => {
  it('classify - trades the user token once - vision gets the widget token', async () => {
    const { sw, edge } = session(() => 'user-a')
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    expect(trades(edge)).toHaveLength(1)
    expect(trades(edge)[0]?.headers.get('authorization')).toBe('Bearer user-a')
    expect(trades(edge)[0]?.url).toBe(`https://api.test/identity/v1/apps/${appId}/widget-tokens`)
    expect(bearer(edge, '/v1/classifications')).toEqual(['Bearer wt-1', 'Bearer wt-1'])
  })

  it('other user token - cached widget token is not reused - new trade', async () => {
    let user = 'user-a'
    const { sw, edge } = session(() => user)
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    user = 'user-b'
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    expect(trades(edge).map((r) => r.headers.get('authorization'))).toEqual([
      'Bearer user-a',
      'Bearer user-b'
    ])
    expect(bearer(edge, '/v1/classifications')).toEqual(['Bearer wt-1', 'Bearer wt-2'])
  })

  it('parallel calls - same user token - share one trade', async () => {
    const { sw, edge } = session(() => 'user-a')
    await Promise.all([
      sw.api.vision.POST('/v1/classifications', { body: { image } }),
      sw.api.vision.POST('/v1/classifications', { body: { image } })
    ])
    expect(trades(edge)).toHaveLength(1)
  })

  it('reset during a trade - the old trade never fills the cache', async () => {
    const edge = fakeEdge()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    edge.routes.push(async (request) => {
      if (request.url.endsWith('/widget-tokens') && trades(edge).length === 1) await gate
      return undefined
    })
    const { sw, reset } = session(() => 'user-a', edge)
    const first = sw.api.vision.POST('/v1/classifications', { body: { image } })
    await tick()
    reset()
    release()
    await expect(first).rejects.toMatchObject({ code: 'unauthenticated' })
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    expect(trades(edge)).toHaveLength(2)
  })

  it('expiry - inside the 30 s margin - trades again', async () => {
    let clock = 0
    const { sw, edge } = session(
      () => 'user-a',
      fakeEdge(),
      () => clock
    )
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    clock = (900 - 29) * 1000
    await sw.api.vision.POST('/v1/classifications', { body: { image } })
    expect(trades(edge)).toHaveLength(2)
  })

  it('identity 401 - signed out - unauthenticated, no vision call', async () => {
    const edge = fakeEdge()
    edge.routes.push((r) =>
      r.url.endsWith('/widget-tokens') ? new Response(null, { status: 401 }) : undefined
    )
    const { sw } = session(() => 'user-a', edge)
    await expect(
      sw.api.vision.POST('/v1/classifications', { body: { image } })
    ).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(edge.calls.some((r) => r.url.endsWith('/v1/classifications'))).toBe(false)
  })

  it('identity 403 problem - forbidden error from the trade', async () => {
    const edge = fakeEdge()
    edge.routes.push((r) =>
      r.url.endsWith('/widget-tokens')
        ? Response.json({ code: 'origin_not_allowed', title: 'Origin' }, { status: 403 })
        : undefined
    )
    const { sw } = session(() => 'user-a', edge)
    await expect(
      sw.api.vision.POST('/v1/classifications', { body: { image } })
    ).rejects.toMatchObject({ code: 'origin_not_allowed', status: 403 })
  })

  it('host hook throws or returns empty - signed out, no trade', async () => {
    for (const get of [
      () => {
        throw new Error('x')
      },
      () => '',
      () => undefined
    ]) {
      const { sw, edge } = session(get)
      await expect(
        sw.api.vision.POST('/v1/classifications', { body: { image } })
      ).rejects.toMatchObject({ code: 'unauthenticated' })
      expect(edge.calls).toHaveLength(0)
    }
  })
})
