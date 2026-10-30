import { describe, expect, it } from 'vitest'
import { errorFromResult, SynthwerkError, toErrorState } from '../../../packages/sdk/src/index.ts'

describe('toErrorState', () => {
  it('quota_exhausted with quota - kind quota, resetsAt from resets_at', () => {
    const quota = {
      scope: 'org',
      unit: 'tokens',
      limit: 10,
      resets_at: '2026-11-01T00:00:00Z'
    } as const
    const state = toErrorState(
      new SynthwerkError({
        code: 'quota_exhausted',
        title: 'q',
        status: 429,
        quota,
        retryAfter: 5
      }),
      0
    )
    expect(state).toMatchObject({ kind: 'quota', code: 'quota_exhausted', quota })
    expect(state.resetsAt?.toISOString()).toBe('2026-11-01T00:00:00.000Z')
  })

  it('quota_exhausted without quota - resetsAt from Retry-After', () => {
    const state = toErrorState(
      new SynthwerkError({ code: 'quota_exhausted', title: 'q', retryAfter: 60 }),
      1000
    )
    expect(state.resetsAt?.getTime()).toBe(61_000)
    expect(toErrorState(new SynthwerkError({ code: 'quota_exhausted', title: 'q' })).resetsAt).toBe(
      undefined
    )
  })

  it.each([
    ['origin_not_allowed', 'not_allowed'],
    ['forbidden', 'not_allowed'],
    ['unauthenticated', 'signed_out'],
    ['too_many_streams', 'busy'],
    ['stream_stalled', 'interrupted'],
    ['offline', 'offline'],
    ['something_new', 'generic']
  ])('%s - kind %s', (code, kind) => {
    expect(toErrorState(new SynthwerkError({ code, title: code })).kind).toBe(kind)
  })

  it('quota resets_at not a date - falls back to Retry-After, never Invalid Date', () => {
    const quota = { scope: 'user', unit: 'tokens', limit: 1, resets_at: 'soon' } as const
    const withHeader = toErrorState(
      new SynthwerkError({ code: 'quota_exhausted', title: 'q', quota, retryAfter: 2 }),
      0
    )
    expect(withHeader.resetsAt?.getTime()).toBe(2000)
    const bare = toErrorState(new SynthwerkError({ code: 'quota_exhausted', title: 'q', quota }), 0)
    expect(bare.resetsAt).toBeUndefined()
  })

  it('not an SDK error - generic, code unknown', () => {
    expect(toErrorState(new Error('x'))).toMatchObject({ kind: 'generic', code: 'unknown' })
  })
})

describe('errorFromResult', () => {
  it('problem body - its code and the HTTP status', () => {
    const response = new Response(null, { status: 429, headers: { 'retry-after': '7' } })
    expect(errorFromResult({ code: 'quota_exhausted', title: 'Q' }, response)).toMatchObject({
      code: 'quota_exhausted',
      status: 429,
      retryAfter: 7
    })
  })

  it.each([
    [403, 'forbidden'],
    [413, 'input_too_large'],
    [415, 'unsupported_media_type'],
    [507, 'storage_full'],
    [500, 'bad_gateway']
  ])('FastAPI {detail} body, %i - %s; the detail never reaches the error', (status, code) => {
    const error = errorFromResult({ detail: 'secret detail' }, new Response(null, { status }))
    expect(error.code).toBe(code)
    expect(error.message).not.toContain('secret')
  })

  it('no response - bad_gateway, status null', () => {
    expect(errorFromResult(null, undefined)).toMatchObject({ code: 'bad_gateway', status: null })
  })
})
