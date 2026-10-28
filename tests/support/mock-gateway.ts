// A Node http mock of the Synthwerk edge for SDK and widget tests (#35, #34).
// Serves /llm/v1/... and /identity/v1/... like the Traefik routes, with SSE answers and
// RFC 9457 problem+json errors in the shape of synthwerk-contracts. No containers.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface RecordedRequest {
  method: string
  path: string
  headers: IncomingMessage['headers']
  body: string
}

export interface SseEvent {
  event: string
  data: unknown
  id?: string
}

/** One scripted step of an answer stream. */
export type StreamStep =
  | { kind: 'event'; event: SseEvent }
  | { kind: 'ping' }
  | { kind: 'wait'; ms: number }
  /** Close the socket without a final event (a dropped connection). */
  | { kind: 'drop' }

export type Reply =
  | { kind: 'stream'; steps: StreamStep[] }
  | {
      kind: 'problem'
      status: number
      code: string
      title?: string
      headers?: Record<string, string>
    }
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'html'; status: number; body: string }

/** Decides the reply for one request. `index` counts requests from 0. */
export type Handler = (request: RecordedRequest, index: number) => Reply

export interface MockGateway {
  /** Edge base URL, for `createSynthwerk({ apiUrl })`. */
  url: string
  requests: RecordedRequest[]
  /** Resolves when the server saw the client close a stream early. */
  closed: Promise<void>
  close(): Promise<void>
}

export function problem(status: number, code: string, title = code): Reply {
  return { kind: 'problem', status, code, title }
}

/** A stream of `delta` events for `tokens`, then `usage` and `done`. */
export function answer(
  tokens: string[],
  messageId = '0199f3b0-1a2c-7c3d-8e4f-5a6b7c8d9e10'
): Reply {
  const steps: StreamStep[] = tokens.map((text, i) => ({
    kind: 'event',
    event: { event: 'delta', id: `${messageId}:${i + 1}`, data: { text } }
  }))
  steps.push({
    kind: 'event',
    event: {
      event: 'usage',
      data: { input_tokens: 12, output_tokens: tokens.length, model: 'default' }
    }
  })
  steps.push({
    kind: 'event',
    event: { event: 'done', data: { message_id: messageId, finish_reason: 'stop' } }
  })
  return { kind: 'stream', steps }
}

function frame(event: SseEvent): string {
  const id = event.id === undefined ? '' : `id: ${event.id}\n`
  return `${id}event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
}

/** Resolves when the chunk is flushed, so a later `drop` cannot swallow it. */
function write(res: ServerResponse, chunk: string): Promise<void> {
  return new Promise((resolve) => res.write(chunk, () => resolve()))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function stream(
  res: ServerResponse,
  steps: StreamStep[],
  onClose: () => void
): Promise<void> {
  let open = true
  res.on('close', () => {
    if (!res.writableFinished) onClose()
    open = false
  })
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-store',
    'x-accel-buffering': 'no'
  })
  res.flushHeaders()
  for (const step of steps) {
    if (!open) return
    if (step.kind === 'wait') await sleep(step.ms)
    else if (step.kind === 'ping') await write(res, ': ping\n\n')
    else if (step.kind === 'drop') {
      res.socket?.destroy()
      return
    } else await write(res, frame(step.event))
  }
  res.end()
}

function send(res: ServerResponse, reply: Exclude<Reply, { kind: 'stream' }>): void {
  if (reply.kind === 'problem') {
    res.writeHead(reply.status, { 'content-type': 'application/problem+json', ...reply.headers })
    res.end(
      JSON.stringify({
        type: `https://schemas.synthwerk.dev/problems/${reply.code}`,
        title: reply.title ?? reply.code,
        status: reply.status,
        code: reply.code,
        trace_id: '4bf92f3577b34da6a3ce929d0e0e4736'
      })
    )
  } else if (reply.kind === 'json') {
    res.writeHead(reply.status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(reply.body))
  } else {
    res.writeHead(reply.status, { 'content-type': 'text/html' })
    res.end(reply.body)
  }
}

export async function startMockGateway(handler: Handler): Promise<MockGateway> {
  const requests: RecordedRequest[] = []
  let markClosed: () => void = () => undefined
  const closed = new Promise<void>((resolve) => {
    markClosed = resolve
  })

  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const recorded: RecordedRequest = {
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }
      const index = requests.push(recorded) - 1
      const reply = handler(recorded, index)
      if (reply.kind === 'stream') void stream(res, reply.steps, markClosed)
      else send(res, reply)
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    closed,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      })
  }
}
