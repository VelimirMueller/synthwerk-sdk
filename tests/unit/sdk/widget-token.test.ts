import { describe, expect, it } from 'vitest'
import { requestWidgetToken, SynthwerkError } from '../../../packages/sdk/src/index.ts'
import { fakeFetch, problemResponse } from '../../support/fake-fetch.ts'

const APP = '019a3b10-7c2d-7e4f-8a5b-6c7d8e9f0a1b'
const grant = {
  access_token: 'widget.jwt.sig',
  token_type: 'Bearer',
  expires_in: 600,
  expires_at: '2026-10-29T10:10:00Z',
  app_id: APP,
  origin: 'https://shop.example'
}

function call(fetch: (input: Request) => Promise<Response>, signal?: AbortSignal) {
  return requestWidgetToken({
    identityUrl: 'https://api.test/identity/',
    appId: APP,
    userToken: 'user-token',
    fetch,
    ...(signal ? { signal } : {})
  })
}

describe('requestWidgetToken', () => {
  it('201 - POST to the app route with the user bearer, no cookies, no cache - data', async () => {
    const fetch = fakeFetch(() => Response.json(grant, { status: 201 }))
    const result = await call(fetch)
    expect(result.data).toEqual({ token: 'widget.jwt.sig', expiresIn: 600 })
    const request = fetch.calls[0]
    expect(request?.method).toBe('POST')
    expect(request?.url).toBe(`https://api.test/identity/v1/apps/${APP}/widget-tokens`)
    expect(request?.headers.get('authorization')).toBe('Bearer user-token')
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(request?.credentials).toBe('omit')
    expect(request?.cache).toBe('no-store')
  })

  it('app id - characters with a URL meaning - encoded in the path', async () => {
    const fetch = fakeFetch(() => Response.json(grant, { status: 201 }))
    await requestWidgetToken({
      identityUrl: 'https://id.test',
      appId: 'a/b?c',
      userToken: 'u',
      fetch
    })
    expect(fetch.calls[0]?.url).toBe('https://id.test/v1/apps/a%2Fb%3Fc/widget-tokens')
  })

  it('expires_in above 900 - capped at 900', async () => {
    const fetch = fakeFetch(() => Response.json({ ...grant, expires_in: 3600 }, { status: 201 }))
    expect((await call(fetch)).data?.expiresIn).toBe(900)
  })

  it('401 - no throw - error body and response for the caller', async () => {
    const fetch = fakeFetch(() => problemResponse(401, 'unauthenticated'))
    const result = await call(fetch)
    expect(result.data).toBeUndefined()
    expect(result.response.status).toBe(401)
    expect((result.error as { code: string }).code).toBe('unauthenticated')
  })

  it('403 origin_not_allowed - problem body as error', async () => {
    const fetch = fakeFetch(() => problemResponse(403, 'origin_not_allowed'))
    const result = await call(fetch)
    expect((result.error as { code: string }).code).toBe('origin_not_allowed')
  })

  it('503 without a JSON body - error null', async () => {
    const fetch = fakeFetch(() => new Response('<html>down</html>', { status: 503 }))
    const result = await call(fetch)
    expect(result.error).toBeNull()
    expect(result.response.status).toBe(503)
  })

  it.each([
    ['no token', { ...grant, access_token: '' }],
    ['token too long', { ...grant, access_token: 'x'.repeat(4097) }],
    ['token not text', { ...grant, access_token: 1 }],
    ['expires_in 0', { ...grant, expires_in: 0 }],
    ['expires_in not an integer', { ...grant, expires_in: 1.5 }],
    ['expires_in missing', { access_token: 't' }],
    ['not an object', 'token']
  ])('201 body %s - throws bad_gateway 502', async (_name, body) => {
    const fetch = fakeFetch(() => Response.json(body, { status: 201 }))
    const error = await call(fetch).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SynthwerkError)
    expect((error as SynthwerkError).code).toBe('bad_gateway')
    expect((error as SynthwerkError).status).toBe(502)
  })

  it('fetch rejects - throws network', async () => {
    const error = await call(async () => {
      throw new TypeError('failed')
    }).catch((e: unknown) => e)
    expect((error as SynthwerkError).code).toBe('network')
  })

  it('aborted signal - throws aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = fakeFetch(() => Response.json(grant, { status: 201 }))
    const error = await call(fetch, controller.signal).catch((e: unknown) => e)
    expect((error as SynthwerkError).code).toBe('aborted')
  })

  it('default fetch - globalThis.fetch is used', async () => {
    const original = globalThis.fetch
    const fetch = fakeFetch(() => Response.json(grant, { status: 201 }))
    globalThis.fetch = fetch as typeof globalThis.fetch
    try {
      await requestWidgetToken({ identityUrl: 'https://id.test', appId: APP, userToken: 'u' })
    } finally {
      globalThis.fetch = original
    }
    expect(fetch.calls).toHaveLength(1)
  })
})
