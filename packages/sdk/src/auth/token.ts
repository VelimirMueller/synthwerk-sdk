// Token mode (D-03, D-13): the host supplies the token, the SDK only asks for it.
// No localStorage, sessionStorage or cookie writes. No token copy beyond one request.
import { singleFlight } from './single-flight.ts'
import type { Auth, AuthUser, TokenAuthOptions } from './types.ts'

/** The auth surface plus the hooks the transport uses. */
export interface TokenAuth extends Auth {
  /** A token for the next request, or `null` (signed out or no session). */
  token(): Promise<string | null>
  /** A new token after a 401. Parallel callers share one `getToken({ refresh: true })`. */
  refresh(): Promise<string | null>
  /** The API answered 401 twice: the session is gone. */
  expire(): void
}

function decodeUser(token: string): AuthUser | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
    const claims: unknown = JSON.parse(json)
    if (typeof claims !== 'object' || claims === null) return null
    const { sub, exp } = claims as { sub?: unknown; exp?: unknown }
    if (typeof sub !== 'string' || sub === '') return null
    return {
      subject: sub,
      expiresAt: typeof exp === 'number' ? exp : null,
      claims: Object.freeze({ ...claims })
    }
  } catch {
    return null
  }
}

export function createTokenAuth(options: TokenAuthOptions): TokenAuth {
  const listeners = new Set<(user: AuthUser | null) => void>()
  let signedOut = false
  let user: AuthUser | null = null

  function setUser(next: AuthUser | null): void {
    const changed = (next?.subject ?? null) !== (user?.subject ?? null)
    user = next
    if (!changed) return
    for (const listener of [...listeners]) listener(next)
  }

  async function ask(refresh: boolean): Promise<string | null> {
    if (signedOut) return null
    const token = await options.getToken({ refresh })
    if (signedOut) return null
    if (typeof token !== 'string' || token === '') {
      setUser(null)
      return null
    }
    setUser(decodeUser(token))
    return token
  }

  const refresh = singleFlight(() => ask(true))

  return {
    token: () => ask(false),
    refresh,
    expire() {
      setUser(null)
    },
    async signIn() {
      signedOut = false
      await ask(false)
      return user
    },
    signOut() {
      signedOut = true
      setUser(null)
    },
    async getUser() {
      await ask(false)
      return user
    },
    getAccessToken: () => ask(false),
    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
