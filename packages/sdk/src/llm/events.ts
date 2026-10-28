// Chat stream events. Names and payloads follow the synthwerk-contracts llm spec (D-44):
// `delta`, `usage`, `done`, `error`. OpenAPI cannot type a stream, so each frame is checked
// here by hand (no schema library in core: size budget).
import { clientError, fromProblem, type SynthwerkError } from '../client/errors.ts'
import type { components } from '../generated/llm.ts'

export type Usage = components['schemas']['Usage']
export type FinishReason = components['schemas']['Done']['finish_reason']

/** One event of a chat answer. Narrow on `type`. `id` is the SSE id (`<message_id>:<sequence>`). */
export type ChatEvent =
  | { type: 'delta'; id: string | undefined; text: string }
  | { type: 'usage'; id: string | undefined; usage: Usage }
  | { type: 'done'; id: string | undefined; messageId: string; finishReason: FinishReason }
  | { type: 'error'; id: string | undefined; error: SynthwerkError }

export interface SseFrame {
  event?: string | undefined
  id?: string | undefined
  data: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function invalid(id: string | undefined): ChatEvent {
  return { type: 'error', id, error: clientError('invalid_event') }
}

/**
 * The ChatEvent of one SSE frame.
 * - Unknown event names: `null` (ignored, later events still arrive).
 * - A known name with bad data: an `error` event with code `invalid_event`.
 */
export function toChatEvent(frame: SseFrame): ChatEvent | null {
  const name = frame.event ?? 'message'
  if (name !== 'delta' && name !== 'usage' && name !== 'done' && name !== 'error') return null
  const { id } = frame
  let data: unknown
  try {
    data = JSON.parse(frame.data)
  } catch {
    return invalid(id)
  }
  if (!isRecord(data)) return invalid(id)

  switch (name) {
    case 'delta':
      return typeof data.text === 'string' ? { type: 'delta', id, text: data.text } : invalid(id)
    case 'usage': {
      const { input_tokens, output_tokens, model } = data
      if (!isCount(input_tokens) || !isCount(output_tokens) || typeof model !== 'string')
        return invalid(id)
      return { type: 'usage', id, usage: { input_tokens, output_tokens, model } }
    }
    case 'done': {
      const { message_id, finish_reason } = data
      if (
        typeof message_id !== 'string' ||
        (finish_reason !== 'stop' && finish_reason !== 'length')
      ) {
        return invalid(id)
      }
      return { type: 'done', id, messageId: message_id, finishReason: finish_reason }
    }
    case 'error': {
      const error = fromProblem(data, null)
      return error ? { type: 'error', id, error } : invalid(id)
    }
  }
}
