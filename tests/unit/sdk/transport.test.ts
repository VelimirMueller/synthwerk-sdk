import { describe, expect, it } from 'vitest'
import { createSynthwerk } from '../../../packages/sdk/src/index.ts'
import { fakeFetch, problemResponse } from '../../support/fake-fetch.ts'

const conversation = {
  id: '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  model: 'default',
  created_at: '2026-10-23T09:00:00Z',
  messages: []
}

describe('transport', () => {
  it('api - create conversation - POST to <apiUrl>/llm with bearer, typed data', async () => {
    const fetch = fakeFetch(() => Response.json(conversation, { status: 201 }))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: async () => 't' },
      fetch
    })
    const { data } = await sw.api.llm.POST('/v1/conversations', { body: { model: 'default' } })
    expect(data?.id).toBe(conversation.id)
    expect(fetch.calls[0]?.url).toBe('https://api.test/llm/v1/conversations')
    expect(fetch.calls[0]?.headers.get('authorization')).toBe('Bearer t')
  })

  it('api - problem response - error is the problem body', async () => {
    const fetch = fakeFetch(() => problemResponse(404, 'not_found'))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => 't' },
      fetch
    })
    const { error } = await sw.api.llm.GET('/v1/conversations/{id}', {
      params: { path: { id: conversation.id } }
    })
    expect(error?.code).toBe('not_found')
  })

  it('api - services override - identity URL used as is', async () => {
    const fetch = fakeFetch(() => Response.json({}))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      services: { identity: 'https://id.test/' },
      auth: { mode: 'token', getToken: () => 't' },
      fetch
    })
    await sw.api.identity.GET('/v1/me')
    expect(fetch.calls[0]?.url).toBe('https://id.test/v1/me')
  })

  it('api - tracing on - traceparent and X-Request-ID sent', async () => {
    const fetch = fakeFetch(() => Response.json({}))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      tracing: true,
      auth: { mode: 'token', getToken: () => 't' },
      fetch
    })
    await sw.api.identity.GET('/v1/me')
    const headers = fetch.calls[0]?.headers
    expect(headers?.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    expect(headers?.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('api - fetch rejects - throws network', async () => {
    const fetch = fakeFetch(() => Promise.reject(new TypeError('fetch failed')))
    const sw = createSynthwerk({
      apiUrl: 'https://api.test',
      auth: { mode: 'token', getToken: () => 't' },
      fetch
    })
    await expect(sw.api.identity.GET('/v1/me')).rejects.toMatchObject({ code: 'network' })
  })
})
