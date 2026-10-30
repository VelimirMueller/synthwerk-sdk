// Vision classification state: one image at a time, latest call wins. Needs a widget token,
// so the source is the widget session of SynthwerkApp (an app id is required).
import { errorFromResult } from '../client/errors.ts'
import type { components } from '../generated/vision.ts'
import type { WidgetSession } from '../identity/widget-session.ts'
import { type ErrorState, toErrorState } from './error-state.ts'
import { createStore, type Readable } from './store.ts'

type Classification = components['schemas']['Classification']

export type ClassifyStatus = 'idle' | 'pending' | 'success' | 'error'

export interface ClassifySnapshot {
  status: ClassifyStatus
  data: Classification | null
  error: ErrorState | null
}

export interface ClassifySource {
  /** The widget-token session, or `null` when the app has no app id. */
  widget(): Pick<WidgetSession, 'sw'> | null
  onUserChange?: (listener: () => void) => () => void
}

export interface ClassifyStore extends Readable<ClassifySnapshot> {
  /**
   * Classifies `image` (JPEG, PNG or WebP). Aborts a running call. Resolves with the
   * classification, or `null` on failure or abort (see `error`). Never rejects.
   */
  classify(image: Blob): Promise<Classification | null>
  /** Aborts and goes back to `idle`. */
  reset(): void
  /** Follows user changes (reset on switch). The returned function stops that and aborts. */
  connect(): () => void
}

const IDLE: ClassifySnapshot = { status: 'idle', data: null, error: null }

export function createClassifyStore(
  source: ClassifySource,
  options: { now?: () => number } = {}
): ClassifyStore {
  const now = options.now ?? Date.now
  const store = createStore<ClassifySnapshot>(IDLE)
  let controller: AbortController | null = null

  function abort(): void {
    controller?.abort()
    controller = null
  }

  async function classify(image: Blob): Promise<Classification | null> {
    abort()
    const current = new AbortController()
    controller = current
    const live = () => controller === current
    store.set({ status: 'pending', data: null, error: null })
    try {
      const widget = source.widget()
      if (!widget) {
        throw new TypeError('@synthwerk/sdk: classify needs an appId (widget token)')
      }
      const { data, error, response } = await widget.sw.api.vision.POST('/v1/classifications', {
        body: { image },
        signal: current.signal
      })
      if (!data) throw errorFromResult(error, response)
      if (!live()) return null
      controller = null
      store.set({ status: 'success', data, error: null })
      return data
    } catch (error) {
      if (!live() || current.signal.aborted) return null
      controller = null
      store.set({ status: 'error', data: null, error: toErrorState(error, now()) })
      return null
    }
  }

  function reset(): void {
    abort()
    store.set(IDLE)
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    classify,
    reset,
    connect() {
      const unsubscribe = source.onUserChange?.(reset)
      return () => {
        unsubscribe?.()
        // Unmount during a call: abort it and do not leave `pending` behind.
        if (store.getSnapshot().status === 'pending') reset()
        else abort()
      }
    }
  }
}
