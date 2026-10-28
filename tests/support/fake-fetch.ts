// In-memory fetch and SSE bodies for SDK unit tests.

/** A text/event-stream body the test writes to chunk by chunk. */
export function sseBody() {
  const encoder = new TextEncoder()
  let controller!: ReadableStreamDefaultController<Uint8Array>
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {
      cancelled = true
    }
  })
  return {
    stream,
    write(text: string) {
      controller.enqueue(encoder.encode(text))
    },
    end() {
      controller.close()
    },
    fail(error: unknown) {
      controller.error(error)
    },
    get cancelled() {
      return cancelled
    }
  }
}

export function sseResponse(body: ReadableStream<Uint8Array> | string): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

export function problemResponse(
  status: number,
  code: string,
  headers: Record<string, string> = {}
) {
  return new Response(
    JSON.stringify({
      type: `https://schemas.synthwerk.dev/problems/${code}`,
      title: code,
      status,
      code
    }),
    { status, headers: { 'content-type': 'application/problem+json', ...headers } }
  )
}

export type FakeFetch = ((input: Request) => Promise<Response>) & { calls: Request[] }

/** A fetch that answers with `reply(request, index)` and records every request. */
export function fakeFetch(
  reply: (request: Request, index: number) => Response | Promise<Response>
): FakeFetch {
  const calls: Request[] = []
  const fn = async (input: Request) => {
    calls.push(input)
    if (input.signal.aborted) throw new DOMException('aborted', 'AbortError')
    return reply(input, calls.length - 1)
  }
  return Object.assign(fn, { calls })
}

/** An unsigned JWT with the given payload (the SDK decodes, the API verifies). */
export function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.sig`
}

export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const item of iterable) out.push(item)
  return out
}
