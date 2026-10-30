// A widget-token session: the host hands in the user token, the session trades it for a
// short-lived widget token (requestWidgetToken) and its client sends only the widget token.
// Vision classification and upload need this token. Ported from synthwerk-widgets
// `src/session.ts` (the rules it learned, synthwerk-widgets#40):
// - The cached widget token belongs to one user token. Another user token needs a new trade.
// - One trade per user token at a time. Parallel callers with the same user token share it.
// - reset() (sign-out, other user) drops the cache; a trade that started before never fills it.
// Tokens stay in memory: no storage, no cookie.
import { createSynthwerk, type Synthwerk } from '../client/create.ts'
import { errorFromResult } from '../client/errors.ts'
import { trimSlash } from '../client/url.ts'
import { requestWidgetToken } from './widget-token.ts'

/** Host hook: the access token of the signed-in user, or `null` when signed out. */
export type GetUserToken = () => string | null | undefined | Promise<string | null | undefined>

export interface WidgetSessionOptions {
  /** Edge base URL. Identity sits under `<apiUrl>/identity`, vision under `<apiUrl>/vision`. */
  apiUrl: string
  /** The app id (UUID) the widget token is for. */
  appId: string
  getUserToken: GetUserToken
  fetch?: (input: Request) => Promise<Response>
  /** Per-service base URLs. Default: `<apiUrl>/identity` and `<apiUrl>/vision`. */
  services?: { identity?: string; vision?: string }
  /** Clock in milliseconds since the epoch. Tests set it. */
  now?: () => number
}

export interface WidgetSession {
  /** A client that sends the widget token. Use `sw.api.vision`. */
  sw: Synthwerk
  /** Drops the cached widget token and any running trade (sign-out, other user). */
  reset(): void
}

/** A new widget token this many seconds before the old one expires. */
export const WIDGET_TOKEN_EXPIRY_MARGIN_S = 30

interface Cached {
  token: string
  expiresAt: number
  /** The user token it was traded for. */
  user: string
}

/** The user token, or `null`. A host hook that throws counts as signed out. */
export async function readUserToken(get: GetUserToken | null | undefined): Promise<string | null> {
  if (!get) return null
  try {
    const token = await get()
    return typeof token === 'string' && token !== '' ? token : null
  } catch {
    return null
  }
}

export function createWidgetSession(options: WidgetSessionOptions): WidgetSession {
  const baseFetch = options.fetch ?? ((input: Request) => globalThis.fetch(input))
  const now = options.now ?? Date.now
  const apiUrl = trimSlash(options.apiUrl)
  const identityUrl = trimSlash(options.services?.identity ?? `${apiUrl}/identity`)
  let cached: Cached | null = null
  /** The running trade and the user token it was started for. */
  let pending: { user: string; promise: Promise<string | null> } | null = null
  /** The user token of the latest getToken call. A trade for an older one is discarded. */
  let latestUser: string | null = null
  /** Bumped by reset(): a trade that started before it never fills the cache. */
  let generation = 0

  async function exchange(user: string): Promise<string | null> {
    const started = generation
    const result = await requestWidgetToken({
      identityUrl,
      appId: options.appId,
      userToken: user,
      fetch: baseFetch
    })
    const { response } = result
    // 401: the user token is gone. Signed out, not an error.
    if (response.status === 401) {
      if (started === generation && cached?.user === user) cached = null
      return null
    }
    if (!result.data) throw errorFromResult(result.error, response)
    // A reset or another user while the trade ran: never hand out or cache this token.
    if (started !== generation || latestUser !== user) return null
    cached = { token: result.data.token, expiresAt: now() + result.data.expiresIn * 1000, user }
    return result.data.token
  }

  function fresh(user: string): Promise<string | null> {
    if (pending?.user === user) return pending.promise
    const run = { user, promise: Promise.resolve<string | null>(null) }
    run.promise = exchange(user).finally(() => {
      if (pending === run) pending = null
    })
    pending = run
    return run.promise
  }

  const sw = createSynthwerk({
    apiUrl,
    fetch: baseFetch,
    ...(options.services ? { services: options.services } : {}),
    auth: {
      mode: 'token',
      getToken: async ({ refresh }) => {
        const started = generation
        const user = await readUserToken(options.getUserToken)
        if (started !== generation) return null
        latestUser = user
        if (!user) {
          cached = null
          return null
        }
        const valid = cached && cached.expiresAt - WIDGET_TOKEN_EXPIRY_MARGIN_S * 1000 > now()
        if (!refresh && valid && cached?.user === user) return cached.token
        return fresh(user)
      }
    }
  })

  return {
    sw,
    reset() {
      generation++
      cached = null
      pending = null
      latestUser = null
    }
  }
}
