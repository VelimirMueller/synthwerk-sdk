// A routed in-memory edge for the adapter and state tests: identity widget tokens,
// llm conversations and chat streams, vision classification.
import { problemResponse, sseBody, sseResponse } from './fake-fetch.ts'

export const conversationId = '6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f'
export const appId = '0199f3b0-0000-7000-8000-000000000001'

export const classification = {
  request_id: 'r1',
  image: { sha256: 'ab', content_type: 'image/jpeg', size_bytes: 3, width: 1, height: 1 },
  model: { name: 'siglip2', taxonomy_version: 1 },
  primary: { id: 'open:hut', label: 'hut', score: 0.3, topic: 'building', path: ['building'] },
  topic: { id: 'building', parent: null, depth: 0, score: 0.8 },
  labels: [],
  topics: [],
  uncertain: false,
  correction: null,
  timings_ms: { total: 1 }
}

export const delta = (text: string, id = 1) =>
  `id: m:${id}\nevent: delta\ndata: ${JSON.stringify({ text })}\n\n`
export const usage = 'event: usage\ndata: {"input_tokens":3,"output_tokens":2,"model":"m"}\n\n'
export const done = 'event: done\ndata: {"message_id":"m","finish_reason":"stop"}\n\n'

export type Route = (request: Request) => Response | undefined | Promise<Response | undefined>

export interface FakeEdge {
  fetch: (request: Request) => Promise<Response>
  calls: Request[]
  /** The open chat stream bodies, oldest first. */
  streams: ReturnType<typeof sseBody>[]
  /** Overrides, checked first. Return undefined to fall through to the defaults. */
  routes: Route[]
}

/** Default answers: widget token `wt-<n>`, conversation `conversationId`, a writable stream, a classification. */
export function fakeEdge(): FakeEdge {
  const calls: Request[] = []
  const streams: ReturnType<typeof sseBody>[] = []
  const routes: Route[] = []
  let widgetTokens = 0
  const fetch = async (request: Request): Promise<Response> => {
    calls.push(request)
    if (request.signal.aborted) throw new DOMException('aborted', 'AbortError')
    for (const route of routes) {
      const reply = await route(request)
      if (reply) return reply
    }
    const { pathname } = new URL(request.url)
    if (pathname.endsWith('/widget-tokens')) {
      widgetTokens++
      return Response.json(
        { access_token: `wt-${widgetTokens}`, token_type: 'Bearer', expires_in: 900 },
        { status: 201 }
      )
    }
    if (pathname === '/llm/v1/conversations') {
      return Response.json({ id: conversationId }, { status: 201 })
    }
    if (pathname.endsWith('/messages')) {
      const body = sseBody()
      streams.push(body)
      request.signal.addEventListener('abort', () => {
        try {
          body.fail(new DOMException('aborted', 'AbortError'))
        } catch {
          // Already closed.
        }
      })
      return sseResponse(body.stream)
    }
    if (pathname === '/vision/v1/classifications') return Response.json(classification)
    return problemResponse(404, 'not_found')
  }
  return { fetch, calls, streams, routes }
}

/** Resolves after pending promise jobs and one macrotask. */
export function tick(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
