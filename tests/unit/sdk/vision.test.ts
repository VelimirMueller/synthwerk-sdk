import { describe, expect, it } from 'vitest'
import { createSynthwerk } from '../../../packages/sdk/src/index.ts'
import { visionBody } from '../../../packages/sdk/src/vision/body.ts'
import { fakeFetch } from '../../support/fake-fetch.ts'

const classification = {
  request_id: 'r1',
  image: { sha256: 'ab', content_type: 'image/jpeg', size_bytes: 3, width: 1, height: 1 },
  model: { name: 'siglip2', taxonomy_version: 1 },
  primary: {
    id: 'open:hut',
    label: 'hut',
    score: 0.3,
    topic: 'building',
    path: ['building', 'hut']
  },
  topic: { id: 'building', parent: null, depth: 0, score: 0.8 },
  labels: [],
  topics: [],
  uncertain: false,
  correction: null,
  timings_ms: { total: 1 }
}

function sdk(fetch: (input: Request) => Promise<Response>, vision?: string) {
  return createSynthwerk({
    apiUrl: 'https://api.test/',
    auth: { mode: 'token', getToken: () => 'widget-token' },
    fetch,
    ...(vision ? { services: { vision } } : {})
  })
}

describe('vision client', () => {
  it('classify - POST <apiUrl>/vision with the widget bearer and a multipart image part', async () => {
    const fetch = fakeFetch(() => Response.json(classification))
    const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
    const { data } = await sdk(fetch).api.vision.POST('/v1/classifications', { body: { image } })
    expect(data?.primary.label).toBe('hut')
    const request = fetch.calls[0]
    expect(request?.url).toBe('https://api.test/vision/v1/classifications')
    expect(request?.headers.get('authorization')).toBe('Bearer widget-token')
    expect(request?.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    const form = await request?.formData()
    const part = form?.get('image')
    expect(part).toBeInstanceOf(Blob)
    expect(new Uint8Array(await (part as Blob).arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff])
    )
  })

  it('upload - 201 - typed stored image; 507 - FastAPI error body', async () => {
    const stored = { id: 'abc', content_type: 'image/png', size_bytes: 3, width: 1, height: 1 }
    const fetch = fakeFetch((_request, index) =>
      index === 0
        ? Response.json(stored, { status: 201 })
        : Response.json({ detail: 'upload storage quota reached' }, { status: 507 })
    )
    const sw = sdk(fetch)
    const image = new Blob(['x'], { type: 'image/png' })
    const ok = await sw.api.vision.POST('/v1/images', { body: { image } })
    expect(ok.data?.id).toBe('abc')
    expect(fetch.calls[0]?.url).toBe('https://api.test/vision/v1/images')
    const full = await sw.api.vision.POST('/v1/images', { body: { image } })
    expect(full.response.status).toBe(507)
    expect(full.error?.detail).toBe('upload storage quota reached')
  })

  it('services override - vision URL used as is', async () => {
    const fetch = fakeFetch(() => Response.json(classification))
    const image = new Blob(['x'])
    await sdk(fetch, 'https://vision.test/').api.vision.POST('/v1/classifications', {
      body: { image }
    })
    expect(fetch.calls[0]?.url).toBe('https://vision.test/v1/classifications')
  })

  it('label route - JSON body - sent as JSON', async () => {
    const fetch = fakeFetch(() => Response.json({}, { status: 201 }))
    await sdk(fetch).api.vision.POST('/v1/orgs/{orgId}/labels', {
      params: { path: { orgId: 'org-1' } },
      body: { name: 'rice paddy', topic: 'landscape', new_topic: false }
    })
    expect(fetch.calls[0]?.headers.get('content-type')).toBe('application/json')
    expect(await fetch.calls[0]?.json()).toEqual({
      name: 'rice paddy',
      topic: 'landscape',
      new_topic: false
    })
  })
})

describe('visionBody', () => {
  it('Blob and text fields - one part each; null and undefined fields - left out', () => {
    const form = visionBody({
      image: new Blob(['x']),
      label_id: 'runtime:a',
      a: null,
      b: undefined
    })
    expect(form).toBeInstanceOf(FormData)
    const parts = [...(form as FormData).keys()]
    expect(parts).toEqual(['image', 'label_id'])
    expect((form as FormData).get('label_id')).toBe('runtime:a')
  })

  it('no Blob, array or text - JSON', () => {
    expect(visionBody({ name: 'a' })).toBe('{"name":"a"}')
    expect(visionBody([1])).toBe('[1]')
    expect(visionBody('a')).toBe('"a"')
  })
})
