// The token rules of src/auth.ts, with oidc-client-ts replaced by a stub.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const manager = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
  getUser: vi.fn(),
  signinSilent: vi.fn(),
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  removeUser: vi.fn()
}))

vi.mock('oidc-client-ts', () => ({
  InMemoryWebStorage: class {},
  WebStorageStateStore: class {},
  UserManager: class {
    constructor(settings: Record<string, unknown>) {
      manager.settings = settings
      Object.assign(this, manager)
    }
  }
}))

const { createOidcAuth } = await import('../src/auth.ts')

const config = {
  apiUrl: 'https://api.test',
  authUrl: 'https://auth.test',
  clientId: 'c1',
  projectId: '42'
}
const user = (patch: Record<string, unknown> = {}) => ({
  access_token: 'a1',
  refresh_token: 'r1',
  expired: false,
  ...patch
})

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('createOidcAuth', () => {
  it('uses code + PKCE with the app origin as redirect and the project scopes', () => {
    createOidcAuth(config)
    expect(manager.settings).toMatchObject({
      authority: 'https://auth.test',
      client_id: 'c1',
      response_type: 'code',
      redirect_uri: `${window.location.origin}/`
    })
    expect(String(manager.settings?.scope)).toContain('urn:zitadel:iam:org:project:id:42:aud')
  })

  it('getToken: null when signed out, the cached token when fresh', async () => {
    const auth = createOidcAuth(config)
    manager.getUser.mockResolvedValueOnce(null)
    expect(await auth.getToken({ refresh: false })).toBeNull()
    manager.getUser.mockResolvedValueOnce(user())
    expect(await auth.getToken({ refresh: false })).toBe('a1')
    expect(manager.signinSilent).not.toHaveBeenCalled()
  })

  it('getToken: a refresh or an expired token renews once for parallel calls', async () => {
    const auth = createOidcAuth(config)
    manager.getUser.mockResolvedValue(user({ expired: true }))
    manager.signinSilent.mockResolvedValue(user({ access_token: 'a2' }))
    const tokens = await Promise.all([
      auth.getToken({ refresh: false }),
      auth.getToken({ refresh: true })
    ])
    expect(tokens).toEqual(['a2', 'a2'])
    expect(manager.signinSilent).toHaveBeenCalledTimes(1)
  })

  it('getToken: no refresh token or a failed renewal means signed out', async () => {
    const auth = createOidcAuth(config)
    manager.getUser.mockResolvedValueOnce(user({ refresh_token: undefined }))
    expect(await auth.getToken({ refresh: true })).toBeNull()
    manager.getUser.mockResolvedValueOnce(user())
    manager.signinSilent.mockRejectedValueOnce(new Error('invalid_grant'))
    expect(await auth.getToken({ refresh: true })).toBeNull()
  })

  it('handleRedirect: finishes a sign-in and removes code and state from the URL', async () => {
    const auth = createOidcAuth(config)
    await auth.handleRedirect()
    expect(manager.signinRedirectCallback).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '/?code=x&state=y')
    await auth.handleRedirect()
    expect(manager.signinRedirectCallback).toHaveBeenCalledOnce()
    expect(window.location.search).toBe('')
  })
})
