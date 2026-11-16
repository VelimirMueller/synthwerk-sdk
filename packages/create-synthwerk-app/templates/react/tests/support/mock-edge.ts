// A fetch mock of the Synthwerk edge for the app tests: identity `GET /v1/me` and the llm
// chat (create a conversation, stream an answer as SSE). The real stack is tested in
// synthwerk-e2e; these tests prove the app wiring only.

export const conversationId = '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f'

export const me = {
  subject: 'user-1',
  org: {
    id: '0199f3b0-0000-7000-8000-0000000000aa',
    name: 'Demo org',
    slug: 'demo',
    created_at: '2026-11-16T09:00:00Z'
  },
  roles: ['member']
}

/** An unsigned JWT. The SDK decodes it; only the API verifies tokens. */
export function fakeToken(subject = me.subject): string {
  const part = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({ sub: subject, exp })}.sig`
}

function sse(tokens: readonly string[]): string {
  const deltas = tokens.map(
    (text, i) => `id: m:${i + 1}\nevent: delta\ndata: ${JSON.stringify({ text })}\n\n`
  )
  return [
    ...deltas,
    `event: usage\ndata: ${JSON.stringify({ input_tokens: 3, output_tokens: tokens.length, model: 'default' })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ message_id: 'm', finish_reason: 'stop' })}\n\n`
  ].join('')
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

export interface MockEdge {
  fetch(input: Request): Promise<Response>
  /** Every request, with its body read as text. */
  calls: { method: string; path: string; authorization: string | null; body: string }[]
}

/** Answers like the edge. `answer` is the token list of the streamed chat answer. */
export function mockEdge(answer: readonly string[] = ['Hello', ' there']): MockEdge {
  const calls: MockEdge['calls'] = []
  return {
    calls,
    async fetch(input) {
      const { pathname } = new URL(input.url)
      calls.push({
        method: input.method,
        path: pathname,
        authorization: input.headers.get('authorization'),
        body: input.method === 'GET' ? '' : await input.clone().text()
      })
      if (!input.headers.get('authorization')) return json(401, { code: 'unauthenticated' })
      if (input.method === 'GET' && pathname === '/identity/v1/me') return json(200, me)
      if (input.method === 'POST' && pathname === '/llm/v1/conversations') {
        return json(201, {
          id: conversationId,
          model: 'default',
          created_at: '2026-11-16T09:00:00Z',
          messages: []
        })
      }
      if (
        input.method === 'POST' &&
        pathname === `/llm/v1/conversations/${conversationId}/messages`
      ) {
        return new Response(sse(answer), {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        })
      }
      return json(404, { code: 'not_found' })
    }
  }
}
