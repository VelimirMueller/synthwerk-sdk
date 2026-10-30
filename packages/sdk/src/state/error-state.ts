// One UI state per failure, the same in every adapter and widget. The SDK gives a
// SynthwerkError with a stable code; this maps it to what a user interface shows.
import { isSynthwerkError, type QuotaExceeded, type SynthwerkError } from '../client/errors.ts'

export type ErrorKind =
  /** No user token, or the API answered 401 twice. Show sign-in. */
  | 'signed_out'
  | 'offline'
  /** `quota_exhausted`: the user or org quota is used up until `resetsAt`. */
  | 'quota'
  /** Too many streams, rate limited or no model: try again later. */
  | 'busy'
  /** 403: the token scope, the role or the page origin does not allow the call. */
  | 'not_allowed'
  | 'too_long'
  /** The stream stalled or dropped after the answer started. */
  | 'interrupted'
  | 'unsupported'
  | 'storage_full'
  | 'generic'

export interface ErrorState {
  kind: ErrorKind
  /** The error code (`quota_exhausted`, `forbidden`, …), or `unknown` for a non-SDK error. */
  code: string
  /** `quota` only: when the quota is full again (from the problem `quota.resets_at`, else `Retry-After`). */
  resetsAt?: Date
  /** `quota` only: which quota ran out (`user` or `org`) and its limit. */
  quota?: QuotaExceeded
  /** The original error. Never shows a token or a prompt. */
  error: SynthwerkError | unknown
}

const KIND_BY_CODE: Readonly<Record<string, ErrorKind>> = {
  unauthenticated: 'signed_out',
  offline: 'offline',
  quota_exhausted: 'quota',
  too_many_streams: 'busy',
  rate_limited: 'busy',
  model_unavailable: 'busy',
  origin_not_allowed: 'not_allowed',
  forbidden: 'not_allowed',
  input_too_large: 'too_long',
  unsupported_media_type: 'unsupported',
  storage_full: 'storage_full',
  stream_stalled: 'interrupted',
  stream_interrupted: 'interrupted'
}

/** The UI state of a failure. `now` is in milliseconds since the epoch. */
export function toErrorState(error: unknown, now: number = Date.now()): ErrorState {
  if (!isSynthwerkError(error)) return { kind: 'generic', code: 'unknown', error }
  const kind = KIND_BY_CODE[error.code] ?? 'generic'
  if (kind !== 'quota') return { kind, code: error.code, error }
  const fromQuota = error.quota ? new Date(error.quota.resets_at) : undefined
  const fromHeader =
    error.retryAfter === undefined ? undefined : new Date(now + error.retryAfter * 1000)
  // Never hand an Invalid Date to a UI: fall back to Retry-After, else leave it out.
  const resetsAt = [fromQuota, fromHeader].find((d) => d && !Number.isNaN(d.getTime()))
  return {
    kind,
    code: error.code,
    error,
    ...(resetsAt === undefined ? {} : { resetsAt }),
    ...(error.quota === undefined ? {} : { quota: error.quota })
  }
}
