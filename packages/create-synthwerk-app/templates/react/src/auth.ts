// Sign-in with OIDC (authorization code + PKCE) through oidc-client-ts. The Synthwerk SDK
// only asks for a token (`getToken`); this file owns the session. Tokens stay in memory:
// a page reload signs the user out of the app, and "Sign in" comes back without a password
// while the identity provider session lives. Swap this file for your own auth library.
import { InMemoryWebStorage, UserManager, WebStorageStateStore } from 'oidc-client-ts'
import type { AppConfig } from './config.ts'

export interface Auth {
  /** The access token, or `null` when signed out. `refresh: true` after a 401. */
  getToken(request: { refresh: boolean }): Promise<string | null>
  /** Goes to the sign-in page of the identity provider. */
  signIn(): Promise<void>
  /** Forgets the tokens in this tab. */
  signOut(): Promise<void>
  /** Finishes a sign-in when the URL carries `code` and `state`, then cleans the URL. */
  handleRedirect(): Promise<void>
}

/** OIDC scopes. With a Zitadel project id the token gets the API audience, roles and org. */
export function scopes(projectId?: string): string {
  const list = ['openid', 'profile', 'offline_access']
  if (projectId) {
    list.push(
      `urn:zitadel:iam:org:project:id:${projectId}:aud`,
      'urn:zitadel:iam:org:projects:roles',
      'urn:zitadel:iam:user:resourceowner'
    )
  }
  return list.join(' ')
}

export function createOidcAuth(config: AppConfig, location: Location = window.location): Auth {
  const redirectUri = `${location.origin}/`
  const manager = new UserManager({
    authority: config.authUrl,
    client_id: config.clientId,
    redirect_uri: redirectUri,
    post_logout_redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes(config.projectId),
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    automaticSilentRenew: false
  })
  let refreshing: Promise<string | null> | null = null

  async function renew(): Promise<string | null> {
    try {
      // With a refresh token, oidc-client-ts uses the refresh grant (no iframe).
      const user = await manager.signinSilent()
      return user?.access_token ?? null
    } catch {
      return null
    }
  }

  return {
    async getToken({ refresh }) {
      const user = await manager.getUser()
      if (!user) return null
      if (!refresh && !user.expired) return user.access_token
      if (!user.refresh_token) return null
      // Parallel 401s share one renewal.
      refreshing ??= renew().finally(() => {
        refreshing = null
      })
      return refreshing
    },
    signIn: () => manager.signinRedirect(),
    signOut: () => manager.removeUser(),
    async handleRedirect() {
      const url = new URL(location.href)
      if (!url.searchParams.has('code') || !url.searchParams.has('state')) return
      try {
        await manager.signinRedirectCallback(url.href)
      } finally {
        window.history.replaceState(null, '', url.pathname)
      }
    }
  }
}
