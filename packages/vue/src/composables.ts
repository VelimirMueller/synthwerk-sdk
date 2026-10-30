// Composables over the framework-free stores of @synthwerk/sdk. Each one binds a store to a
// shallowRef and ties its lifetime to the calling effect scope (component or scope).
import {
  type AuthStatus,
  type AuthUser,
  type ChatMessage,
  type ChatStoreOptions,
  type Classification,
  type ClassifyStatus,
  createChatStore,
  createClassifyStore,
  type ErrorState,
  type Readable,
  type Usage
} from '@synthwerk/sdk'
import {
  type ComputedRef,
  computed,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef
} from 'vue'
import { useSynthwerk } from './plugin.ts'

function useReadable<T>(readable: Readable<T>): ComputedRef<T> {
  const state = shallowRef(readable.getSnapshot())
  onScopeDispose(
    readable.subscribe(() => {
      state.value = readable.getSnapshot()
    })
  )
  return computed(() => state.value)
}

export interface UseAuth {
  status: ComputedRef<AuthStatus>
  user: ComputedRef<AuthUser | null>
  /** Asks `getToken` once. Clears a previous signOut(). */
  signIn(): Promise<AuthUser | null>
  /** Stops all calls and drops all user data (chats, widget token). */
  signOut(): void
  /** Call when the host session changed (sign-in, sign-out, other user). */
  sessionChanged(): Promise<AuthUser | null>
}

/** Sign-in state. The first mounted user checks the token; SSR stays `unknown`. */
export function useAuth(): UseAuth {
  const app = useSynthwerk()
  const snapshot = useReadable(app.auth)
  const check = () => {
    if (app.auth.getSnapshot().status === 'unknown') void app.checkAuth()
  }
  // In a component: check on mount (never on the server). In a bare scope: check now.
  if (getCurrentInstance()) onMounted(check)
  else check()
  return {
    status: computed(() => snapshot.value.status),
    user: computed(() => snapshot.value.user),
    signIn: app.checkAuth,
    signOut: app.signOut,
    sessionChanged: app.sessionChanged
  }
}

export interface UseChat {
  conversationId: ComputedRef<string | null>
  /** The last assistant message grows token by token while it streams. */
  messages: ComputedRef<readonly ChatMessage[]>
  streaming: ComputedRef<boolean>
  error: ComputedRef<ErrorState | null>
  usage: ComputedRef<Usage | null>
  /** A message that failed before any answer: put it back into the input. */
  failedText: ComputedRef<string | null>
  /** Sends a message and streams the answer. Never rejects. */
  send(text: string): Promise<void>
  stop(): void
  dismiss(): void
  reset(): void
}

/**
 * One chat conversation. Scope dispose (unmount) aborts the stream; a user switch or
 * sign-out clears the chat.
 */
export function useChat(options?: ChatStoreOptions): UseChat {
  const app = useSynthwerk()
  const store = createChatStore({ sw: app.sw, onUserChange: app.onUserChange }, options)
  onScopeDispose(store.connect())
  const snapshot = useReadable(store)
  return {
    conversationId: computed(() => snapshot.value.conversationId),
    messages: computed(() => snapshot.value.messages),
    streaming: computed(() => snapshot.value.streaming),
    error: computed(() => snapshot.value.error),
    usage: computed(() => snapshot.value.usage),
    failedText: computed(() => snapshot.value.failedText),
    send: store.send,
    stop: store.stop,
    dismiss: store.dismiss,
    reset: store.reset
  }
}

export interface UseClassify {
  status: ComputedRef<ClassifyStatus>
  data: ComputedRef<Classification | null>
  error: ComputedRef<ErrorState | null>
  /** Classifies an image (a File is a Blob). Latest call wins. Never rejects. */
  classify(image: Blob): Promise<Classification | null>
  reset(): void
}

/** Vision classification with a widget token. Needs `appId`. Scope dispose aborts. */
export function useClassify(): UseClassify {
  const app = useSynthwerk()
  const store = createClassifyStore({ widget: app.widget, onUserChange: app.onUserChange })
  onScopeDispose(store.connect())
  const snapshot = useReadable(store)
  return {
    status: computed(() => snapshot.value.status),
    data: computed(() => snapshot.value.data),
    error: computed(() => snapshot.value.error),
    classify: store.classify,
    reset: store.reset
  }
}
