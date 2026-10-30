// The query options run on a real TanStack QueryClient (query-core, the base of the
// React and Vue bindings).
import { MutationObserver, QueryClient } from '@tanstack/query-core'
import { describe, expect, it } from 'vitest'
import {
  classifyMutation,
  conversationQuery,
  createSynthwerkApp,
  meQuery,
  synthwerkKeys
} from '../../../packages/sdk/src/index.ts'
import { appId, conversationId, fakeEdge } from '../../support/fake-edge.ts'
import { jwt, problemResponse } from '../../support/fake-fetch.ts'

const me = { subject: 'alice', email: null, orgs: [] }

function setup(withAppId = true) {
  const edge = fakeEdge()
  edge.routes.push((r) => {
    const path = new URL(r.url).pathname
    if (path === '/identity/v1/me') return Response.json(me)
    if (path === `/llm/v1/conversations/${conversationId}` && r.method === 'GET') {
      return Response.json({ id: conversationId, messages: [] })
    }
    if (path === '/llm/v1/conversations/missing') return problemResponse(404, 'not_found')
    return undefined
  })
  const app = createSynthwerkApp({
    apiUrl: 'https://api.test',
    getToken: () => jwt({ sub: 'alice' }),
    fetch: edge.fetch,
    ...(withAppId ? { appId } : {})
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { app, edge, client }
}

describe('TanStack query options', () => {
  it('meQuery - key has the user subject; data from identity', async () => {
    const { app, client } = setup()
    await app.checkAuth()
    const options = meQuery(app)
    expect(options.queryKey).toEqual(['synthwerk', 'alice', 'identity', 'me'])
    expect(await client.fetchQuery(options)).toEqual(me)
    client.removeQueries({ queryKey: synthwerkKeys.all })
    expect(client.getQueryData(options.queryKey)).toBeUndefined()
  })

  it('conversationQuery - typed data; 404 - SynthwerkError not_found', async () => {
    const { app, client } = setup()
    const data = await client.fetchQuery(conversationQuery(app, conversationId))
    expect(data.id).toBe(conversationId)
    await expect(client.fetchQuery(conversationQuery(app, 'missing'))).rejects.toMatchObject({
      code: 'not_found'
    })
  })

  it('classifyMutation - widget token; no appId - TypeError', async () => {
    const { app, client, edge } = setup()
    const image = new Blob(['x'], { type: 'image/png' })
    const result = await new MutationObserver(client, classifyMutation(app)).mutate(image)
    expect(result.primary.label).toBe('hut')
    expect(
      edge.calls.find((r) => r.url.endsWith('/v1/classifications'))?.headers.get('authorization')
    ).toBe('Bearer wt-1')
    const bare = setup(false)
    await expect(
      new MutationObserver(bare.client, classifyMutation(bare.app)).mutate(image)
    ).rejects.toBeInstanceOf(TypeError)
  })

  it('classifyMutation - 413 FastAPI body - input_too_large', async () => {
    const { app, client, edge } = setup()
    edge.routes.unshift((r) =>
      r.url.endsWith('/v1/classifications')
        ? Response.json({ detail: 'big' }, { status: 413 })
        : undefined
    )
    await expect(
      new MutationObserver(client, classifyMutation(app)).mutate(new Blob(['x']))
    ).rejects.toMatchObject({ code: 'input_too_large' })
  })
})
