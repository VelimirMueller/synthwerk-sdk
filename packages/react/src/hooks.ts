// Hooks over the framework-free stores of @synthwerk/sdk. Each hook only binds a store to
// React (useSyncExternalStore) and ties its lifetime to the component.
import {
  type AuthSnapshot,
  type AuthUser,
  type ChatSnapshot,
  type ChatStoreOptions,
  type Classification,
  type ClassifySnapshot,
  createChatStore,
  createClassifyStore,
  type Readable
} from '@synthwerk/sdk'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useSynthwerk } from './provider.ts'

function useReadable<T>(readable: Readable<T>): T {
  return useSyncExternalStore(readable.subscribe, readable.getSnapshot, readable.getSnapshot)
}

export interface UseAuth extends AuthSnapshot {
  /** Asks `getToken` once. Clears a previous signOut(). */
  signIn(): Promise<AuthUser | null>
  /** Stops all calls and drops all user data (chats, widget token). */
  signOut(): void
  /** Call when the host session changed (sign-in, sign-out, other user). */
  sessionChanged(): Promise<AuthUser | null>
}

/** Sign-in state. The first mount checks the token; the server render stays `unknown`. */
export function useAuth(): UseAuth {
  const app = useSynthwerk()
  const snapshot = useReadable(app.auth)
  useEffect(() => {
    if (app.auth.getSnapshot().status === 'unknown') void app.checkAuth()
  }, [app])
  return {
    ...snapshot,
    signIn: app.checkAuth,
    signOut: app.signOut,
    sessionChanged: app.sessionChanged
  }
}

export interface UseChat extends ChatSnapshot {
  /** Sends a message and streams the answer into `messages`. Never rejects. */
  send(text: string): Promise<void>
  /** Aborts the stream; the partial answer stays as `stopped`. */
  stop(): void
  /** Hides `error`. */
  dismiss(): void
  /** Forgets the conversation. */
  reset(): void
}

/**
 * One chat conversation. Tokens arrive in the last assistant message as they stream.
 * Unmount aborts the stream; a user switch or sign-out clears the chat.
 * `options` are read once.
 */
export function useChat(options?: ChatStoreOptions): UseChat {
  const app = useSynthwerk()
  // biome-ignore lint/correctness/useExhaustiveDependencies: options are read once by design
  const store = useMemo(
    () => createChatStore({ sw: app.sw, onUserChange: app.onUserChange }, options),
    [app]
  )
  useEffect(() => store.connect(), [store])
  const snapshot = useReadable(store)
  return {
    ...snapshot,
    send: store.send,
    stop: store.stop,
    dismiss: store.dismiss,
    reset: store.reset
  }
}

export interface UseClassify extends ClassifySnapshot {
  /** Classifies an image (a File is a Blob). Latest call wins. Never rejects. */
  classify(image: Blob): Promise<Classification | null>
  reset(): void
}

/**
 * Vision classification with a widget token. Needs `appId` in the provider options.
 * Unmount aborts the call; a user switch or sign-out clears the result.
 */
export function useClassify(): UseClassify {
  const app = useSynthwerk()
  const store = useMemo(
    () => createClassifyStore({ widget: app.widget, onUserChange: app.onUserChange }),
    [app]
  )
  useEffect(() => store.connect(), [store])
  const snapshot = useReadable(store)
  return { ...snapshot, classify: store.classify, reset: store.reset }
}
