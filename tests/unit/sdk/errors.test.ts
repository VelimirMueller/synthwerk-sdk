import { describe, expect, it } from 'vitest'
import {
  fromFetchFailure,
  fromProblem,
  fromResponse,
  SynthwerkError
} from '../../../packages/sdk/src/client/errors.ts'
import { problemResponse } from '../../support/fake-fetch.ts'

describe('errors', () => {
  it('fromResponse - problem+json with code - SynthwerkError.code equals server code', async () => {
    const error = await fromResponse(
      problemResponse(429, 'quota_exhausted', { 'retry-after': '30' })
    )
    expect(error).toBeInstanceOf(SynthwerkError)
    expect(error.code).toBe('quota_exhausted')
    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(30)
    expect(error.retryable).toBe(false)
  })

  it('fromResponse - unknown server code - passed through', async () => {
    const error = await fromResponse(problemResponse(409, 'slug_taken'))
    expect(error.code).toBe('slug_taken')
  })

  it('fromResponse - HTML 502 body - code bad_gateway, body not in message', async () => {
    const html = '<html><body>nginx upstream secret-host-name</body></html>'
    const error = await fromResponse(
      new Response(html, { status: 502, headers: { 'content-type': 'text/html' } })
    )
    expect(error.code).toBe('bad_gateway')
    expect(error.status).toBe(502)
    expect(error.retryable).toBe(true)
    expect(error.message).not.toContain('secret-host-name')
    expect(JSON.stringify(error)).not.toContain('secret-host-name')
  })

  it('fromResponse - HTML 401 - code unauthenticated', async () => {
    const error = await fromResponse(new Response('<p>no</p>', { status: 401 }))
    expect(error.code).toBe('unauthenticated')
  })

  it('fromResponse - JSON without code - mapped from status', async () => {
    const error = await fromResponse(Response.json({ message: 'nope' }, { status: 503 }))
    expect(error.code).toBe('bad_gateway')
  })

  it('fromProblem - model_unavailable in an error event - retryable with trace id', () => {
    const error = fromProblem(
      {
        type: 'https://schemas.synthwerk.dev/problems/model_unavailable',
        title: 'Model unavailable',
        status: 503,
        code: 'model_unavailable',
        trace_id: '4bf92f3577b34da6a3ce929d0e0e4736'
      },
      null
    )
    expect(error?.code).toBe('model_unavailable')
    expect(error?.status).toBe(503)
    expect(error?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736')
    expect(error?.retryable).toBe(true)
  })

  it('fromProblem - code with bad characters - not a problem', () => {
    expect(fromProblem({ code: 'Bad Code', title: 'x' }, 400)).toBeNull()
  })

  it('fromFetchFailure - TypeError while navigator is offline - code offline', () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
    try {
      expect(fromFetchFailure(new TypeError('fetch failed')).code).toBe('offline')
    } finally {
      if (before) Object.defineProperty(globalThis, 'navigator', before)
      else Reflect.deleteProperty(globalThis, 'navigator')
    }
  })

  it('fromFetchFailure - TypeError while online - code network, retryable', () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
    try {
      const error = fromFetchFailure(new TypeError('fetch failed'))
      expect(error.code).toBe('network')
      expect(error.retryable).toBe(true)
    } finally {
      if (before) Object.defineProperty(globalThis, 'navigator', before)
      else Reflect.deleteProperty(globalThis, 'navigator')
    }
  })

  it('fromResponse - HTML 429 from a proxy - code rate_limited, retryable', async () => {
    const error = await fromResponse(new Response('<p>slow down</p>', { status: 429 }))
    expect(error.code).toBe('rate_limited')
    expect(error.retryable).toBe(true)
  })

  it('fromResponse - body status differs from HTTP status - HTTP status wins', async () => {
    const body = { type: 'x', title: 'x', status: 200, code: 'not_found' }
    const error = await fromResponse(
      new Response(JSON.stringify(body), {
        status: 404,
        headers: { 'content-type': 'application/problem+json' }
      })
    )
    expect(error.status).toBe(404)
  })

  it('fromFetchFailure - aborted signal - code aborted', () => {
    const controller = new AbortController()
    controller.abort()
    expect(fromFetchFailure(new Error('x'), controller.signal).code).toBe('aborted')
  })
})
