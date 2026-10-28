import { afterEach, describe, expect, it, vi } from 'vitest'
import { singleFlight } from '../../../packages/sdk/src/auth/single-flight.ts'
import { type AuthUser, createSynthwerk } from '../../../packages/sdk/src/index.ts'
import { fakeFetch, jwt, problemResponse } from '../../support/fake-fetch.ts'

const me = {
  subject: 'u1',
  org: {
    id: '0199f3a0-5b6c-7d8e-9f0a-1b2c3d4e5f60',
    name: 'S',
    slug: 's',
    created_at: '2026-10-23T08:00:00Z'
  },
  roles: ['owner']
}

describe('singleFlight', () => {
  it('singleFlight - three parallel callers - one run, same result', async () => {
    const task = vi.fn(async () => 'token')
    const run = singleFlight(task)
    expect(await Promise.all([run(), run(), run()])).toEqual(['token', 'token', 'token'])
    expect(task).toHaveBeenCalledTimes(1)
    await run()
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('singleFlight - three parallel 401 - one refresh, three retries', async () => {
    const getToken = vi.fn(async ({ refresh }: { refresh: boolean }) =>
      refresh ? 'fresh' : 'stale'
    )
    const fetch = fakeFetch((req) =>
      req.headers.get('authorization') === 'Bearer fresh'
        ? Response.json(me)
        : problemResponse(401, 'unauthenticated')
    )
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken },
      fetch
    })
    const results = await Promise.all([1, 2, 3].map(() => sw.api.identity.GET('/v1/me')))
    expect(results.map((r) => r.data?.subject)).toEqual(['u1', 'u1', 'u1'])
    expect(getToken.mock.calls.filter(([o]) => o.refresh)).toHaveLength(1)
    expect(fetch.calls).toHaveLength(6)
  })

  it('singleFlight - refresh fails - all three reject with unauthenticated', async () => {
    const getToken = vi.fn(async ({ refresh }: { refresh: boolean }) => (refresh ? null : 'stale'))
    const fetch = fakeFetch(() => problemResponse(401, 'unauthenticated'))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken },
      fetch
    })
    const results = await Promise.allSettled([1, 2, 3].map(() => sw.api.identity.GET('/v1/me')))
    for (const result of results) {
      expect(result.status).toBe('rejected')
      expect((result as PromiseRejectedResult).reason).toMatchObject({ code: 'unauthenticated' })
    }
    expect(getToken.mock.calls.filter(([o]) => o.refresh)).toHaveLength(1)
  })
})

describe('auth (token mode)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('auth - token mode - token never written to any storage', async () => {
    const storage = () => ({
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    })
    const localStorage = storage()
    const sessionStorage = storage()
    const cookieSet = vi.fn()
    const document = {}
    Object.defineProperty(document, 'cookie', { set: cookieSet, get: () => '' })
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('sessionStorage', sessionStorage)
    vi.stubGlobal('document', document)

    const token = jwt({ sub: 'u1', exp: 2_000_000_000 })
    const fetch = fakeFetch(() => Response.json(me))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => token },
      fetch
    })
    await sw.auth.signIn()
    await sw.api.identity.GET('/v1/me')
    expect(await sw.auth.getAccessToken()).toBe(token)
    sw.auth.signOut()

    for (const store of [localStorage, sessionStorage]) {
      expect(store.setItem).not.toHaveBeenCalled()
    }
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('getUser - JWT token - subject and exp from the payload', async () => {
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => jwt({ sub: 'u1', exp: 1_900_000_000, org_id: 'o1' }) }
    })
    const user = await sw.auth.getUser()
    expect(user).toMatchObject({ subject: 'u1', expiresAt: 1_900_000_000 })
    expect(user?.claims.org_id).toBe('o1')
  })

  it('getUser - opaque token - null', async () => {
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => 'opaque-token' }
    })
    expect(await sw.auth.getUser()).toBeNull()
  })

  it('onChange - sign-in, sign-out - listener gets the user, then null', async () => {
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => jwt({ sub: 'u1' }) }
    })
    const seen: (AuthUser | null)[] = []
    const off = sw.auth.onChange((user) => seen.push(user))
    await sw.auth.signIn()
    await sw.auth.getUser()
    sw.auth.signOut()
    off()
    await sw.auth.signIn()
    expect(seen.map((u) => u?.subject ?? null)).toEqual(['u1', null])
  })

  it('signOut - then a call - unauthenticated, fetch not called', async () => {
    const fetch = fakeFetch(() => Response.json(me))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => 't' },
      fetch
    })
    sw.auth.signOut()
    await expect(sw.api.identity.GET('/v1/me')).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(fetch.calls).toHaveLength(0)
    expect(await sw.auth.getAccessToken()).toBeNull()
  })

  it('transport - second 401 - onChange(null), 401 response returned', async () => {
    const fetch = fakeFetch(() => problemResponse(401, 'unauthenticated'))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => jwt({ sub: 'u1' }) },
      fetch
    })
    const seen: (AuthUser | null)[] = []
    sw.auth.onChange((user) => seen.push(user))
    const { error, response } = await sw.api.identity.GET('/v1/me')
    expect(response.status).toBe(401)
    expect(error).toMatchObject({ code: 'unauthenticated' })
    expect(fetch.calls).toHaveLength(2)
    expect(seen.map((u) => u?.subject ?? null)).toEqual(['u1', null])
  })

  it('createSynthwerk - unsupported auth mode - throws', () => {
    expect(() =>
      createSynthwerk({
        apiUrl: 'https://api.test',
        auth: { mode: 'pkce' } as unknown as { mode: 'token'; getToken: () => null }
      })
    ).toThrow(/not supported/)
  })
})
