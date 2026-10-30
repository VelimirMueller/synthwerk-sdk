// Trades the access token of a signed-in user for a short-lived widget token
// (identity `POST /v1/apps/{appId}/widget-tokens`, synthwerk-contracts `identity.createWidgetToken`).
// It does not use the SDK transport: that transport sends the widget token, and this call
// needs the user token. The caller keeps the tokens; the SDK stores neither.

import { clientError, fromFetchFailure } from '../client/errors.ts'
import type { components as IdentityComponents } from '../generated/identity.ts'

/** The 201 body of the widget-token route. */
export type WidgetToken = IdentityComponents['schemas']['WidgetToken']

/** The part of a widget token a client needs. */
export interface WidgetTokenGrant {
  /** The widget token (JWT). Send it as `Authorization: Bearer <token>`. Never log it. */
  token: string
  /** Seconds until it expires, 1 to 900. A larger server value is capped at 900 (the contract maximum). */
  expiresIn: number
}

export interface WidgetTokenRequest {
  /** Identity base URL, for example `https://api.example.com/identity`. */
  identityUrl: string
  /** The app id (UUID) of the widget. */
  appId: string
  /** The access token of the signed-in user. Never a widget token. */
  userToken: string
  /** Custom fetch. Default: `globalThis.fetch`. */
  fetch?: (input: Request) => Promise<Response>
  signal?: AbortSignal
}

/**
 * `data` on 2xx, else `error` (the parsed body or `null`) and the response. The caller
 * decides what a status means; for example 401 means the user token is no longer valid.
 */
export type WidgetTokenResult =
  | { data: WidgetTokenGrant; error?: never; response: Response }
  | { data?: never; error: unknown; response: Response }

/** Identity never issues a widget token for longer than 15 minutes. */
const MAX_EXPIRES_IN_S = 900
const MAX_TOKEN_LENGTH = 4096

function readGrant(body: unknown): WidgetTokenGrant | null {
  if (typeof body !== 'object' || body === null) return null
  const { access_token: token, expires_in: expiresIn } = body as Record<string, unknown>
  if (typeof token !== 'string' || token === '' || token.length > MAX_TOKEN_LENGTH) return null
  if (typeof expiresIn !== 'number' || !Number.isInteger(expiresIn) || expiresIn < 1) return null
  return { token, expiresIn: Math.min(expiresIn, MAX_EXPIRES_IN_S) }
}

/**
 * Asks identity for a widget token for `appId`. The browser sets `Origin`; identity binds
 * the token to it. No cookies, no HTTP cache.
 * - 2xx with a valid body: `{ data }`.
 * - Any other status: `{ error, response }`. Nothing is thrown.
 * - A 2xx body that is not a widget token: throws `bad_gateway` (status 502).
 * - A rejected fetch: throws `aborted`, `offline` or `network`.
 */
export async function requestWidgetToken(options: WidgetTokenRequest): Promise<WidgetTokenResult> {
  const send = options.fetch ?? ((input: Request) => globalThis.fetch(input))
  const base = options.identityUrl.replace(/\/+$/, '')
  const url = `${base}/v1/apps/${encodeURIComponent(options.appId)}/widget-tokens`
  const request = new Request(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.userToken}`, accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store',
    ...(options.signal ? { signal: options.signal } : {})
  })
  let response: Response
  try {
    response = await send(request)
  } catch (cause) {
    throw fromFetchFailure(cause, options.signal)
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) return { error: body, response }
  const data = readGrant(body)
  if (!data) throw clientError('bad_gateway', 502)
  return { data, response }
}
