// One error type for every SDK failure. Server codes come from RFC 9457 problem+json
// (synthwerk-contracts `Problem`); client codes are listed in ClientErrorCode.
// Never put a token, a prompt or a raw response body into message, detail or cause.
import type { components as LlmComponents } from '../generated/llm.ts'

/** Codes the SDK sets itself. Server codes (for example `quota_exhausted`) pass through as they are. */
export type ClientErrorCode =
  | 'unauthenticated'
  | 'network'
  | 'offline'
  | 'aborted'
  | 'stream_stalled'
  | 'stream_interrupted'
  | 'invalid_event'
  | 'bad_gateway'
  | 'rate_limited'

/** A client code, a known server code or any other server code (clients must accept unknown codes). */
export type ErrorCode =
  | ClientErrorCode
  | 'invalid_request'
  | 'forbidden'
  | 'not_found'
  | 'input_too_large'
  | 'too_many_streams'
  | 'quota_exhausted'
  | 'model_unavailable'
  | (string & {})

/**
 * The quota that ran out (`quota` of a `quota_exhausted` problem, synthwerk-contracts
 * `QuotaExceeded`). `scope` `user`: the caller's own quota. `org`: the shared org quota.
 */
export type QuotaExceeded = LlmComponents['schemas']['QuotaExceeded']

export interface SynthwerkErrorInit {
  code: ErrorCode
  title: string
  /** HTTP status, or the status an SSE `error` event maps to. `null` when no response came. */
  status?: number | null
  detail?: string
  traceId?: string
  /** Seconds from `Retry-After`. */
  retryAfter?: number
  /** `quota_exhausted` only: the quota that ran out. */
  quota?: QuotaExceeded
  cause?: unknown
}

const RETRYABLE = new Set<string>([
  'network',
  'offline',
  'stream_stalled',
  'stream_interrupted',
  'bad_gateway',
  'model_unavailable',
  'too_many_streams',
  'rate_limited'
])

export class SynthwerkError extends Error {
  override readonly name = 'SynthwerkError'
  readonly code: ErrorCode
  readonly title: string
  readonly status: number | null
  readonly detail: string | undefined
  readonly traceId: string | undefined
  readonly retryAfter: number | undefined
  /** `quota_exhausted` only: the scope, the limit and the reset time of the quota that ran out. */
  readonly quota: QuotaExceeded | undefined
  /** True when the same call can succeed later without a change by the user. */
  readonly retryable: boolean

  constructor(init: SynthwerkErrorInit) {
    super(
      `${init.code}: ${init.title}`,
      init.cause === undefined ? undefined : { cause: init.cause }
    )
    this.code = init.code
    this.title = init.title
    this.status = init.status ?? null
    this.detail = init.detail
    this.traceId = init.traceId
    this.retryAfter = init.retryAfter
    this.quota = init.quota
    this.retryable = RETRYABLE.has(init.code)
  }
}

export function isSynthwerkError(value: unknown): value is SynthwerkError {
  return value instanceof SynthwerkError
}

const TITLES: Record<ClientErrorCode, string> = {
  unauthenticated: 'Unauthenticated',
  network: 'Network error',
  offline: 'Offline',
  aborted: 'Aborted',
  stream_stalled: 'Stream stalled',
  stream_interrupted: 'Stream interrupted',
  invalid_event: 'Invalid stream event',
  bad_gateway: 'Bad gateway',
  rate_limited: 'Rate limited'
}

export function clientError(
  code: ClientErrorCode,
  status: number | null = null,
  cause?: unknown
): SynthwerkError {
  return new SynthwerkError({ code, title: TITLES[code], status, cause })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CODE = /^[a-z][a-z0-9_]*$/
const MAX_QUOTA_LIMIT = 1_000_000_000_000

/**
 * The `quota` member of a problem, or `undefined` when it does not fit `QuotaExceeded`.
 * A bad member never fails the error: the code and the status still count.
 */
function readQuota(value: unknown): QuotaExceeded | undefined {
  if (!isRecord(value)) return undefined
  const { scope, unit, limit, resets_at: resetsAt } = value
  if (scope !== 'user' && scope !== 'org') return undefined
  if (unit !== 'tokens') return undefined
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) return undefined
  if (limit > MAX_QUOTA_LIMIT) return undefined
  if (typeof resetsAt !== 'string' || resetsAt.length > 40 || Number.isNaN(Date.parse(resetsAt))) {
    return undefined
  }
  return { scope, unit, limit, resets_at: resetsAt }
}

/**
 * A SynthwerkError from a problem object, or `null` when the value is not a problem.
 * `status` is the HTTP status and wins; the body `status` counts only when there is none
 * (an SSE `error` event, where HTTP stays 200).
 */
export function fromProblem(
  value: unknown,
  status: number | null,
  retryAfter?: number
): SynthwerkError | null {
  if (!isRecord(value)) return null
  const { code, title, detail, trace_id: traceId } = value
  if (typeof code !== 'string' || !CODE.test(code) || code.length > 64) return null
  const problemStatus = status ?? (typeof value.status === 'number' ? value.status : null)
  const quota = code === 'quota_exhausted' ? readQuota(value.quota) : undefined
  return new SynthwerkError({
    code,
    title: typeof title === 'string' ? title.slice(0, 128) : code,
    status: problemStatus,
    ...(typeof detail === 'string' ? { detail: detail.slice(0, 512) } : {}),
    ...(typeof traceId === 'string' ? { traceId } : {}),
    ...(retryAfter === undefined ? {} : { retryAfter }),
    ...(quota === undefined ? {} : { quota })
  })
}

function retryAfterOf(response: Response): number | undefined {
  const raw = response.headers.get('retry-after')
  if (raw === null || !/^\d+$/.test(raw.trim())) return undefined
  return Number(raw.trim())
}

/**
 * The error for a non-2xx response. Reads the body.
 * - problem+json (or JSON with a valid `code`): the server code.
 * - Anything else (an HTML proxy page): a code from the status. The body never reaches the error.
 */
export async function fromResponse(response: Response): Promise<SynthwerkError> {
  const retryAfter = retryAfterOf(response)
  const type = response.headers.get('content-type') ?? ''
  if (type.includes('json')) {
    try {
      const problem = fromProblem(await response.json(), response.status, retryAfter)
      if (problem) return problem
    } catch {
      // Not JSON after all: fall through to the status mapping.
    }
  } else {
    await response.body?.cancel().catch(() => undefined)
  }
  const code: ClientErrorCode | 'forbidden' =
    response.status === 401
      ? 'unauthenticated'
      : response.status === 403
        ? 'forbidden'
        : response.status === 429
          ? 'rate_limited'
          : 'bad_gateway'
  return new SynthwerkError({
    code,
    title: code === 'forbidden' ? 'Forbidden' : TITLES[code],
    status: response.status,
    ...(retryAfter === undefined ? {} : { retryAfter })
  })
}

/** Maps a rejected `fetch` (or `read`) to `aborted`, `offline` or `network`. */
export function fromFetchFailure(cause: unknown, signal?: AbortSignal): SynthwerkError {
  if (isSynthwerkError(cause)) return cause
  if (signal?.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
    return clientError('aborted', null, cause)
  }
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator
  return clientError(nav?.onLine === false ? 'offline' : 'network', null, cause)
}
