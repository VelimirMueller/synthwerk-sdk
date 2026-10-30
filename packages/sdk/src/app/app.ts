// The framework-free core of the React and Vue adapters: one SDK client, the sign-in
// state and the user-switch rule. The adapters only bind these stores to their framework.
import type { AuthUser, GetToken } from '../auth/types.ts'
import { createSynthwerk, type Synthwerk } from '../client/create.ts'
import { createWidgetSession, type WidgetSession } from '../identity/widget-session.ts'
import { createStore, type Readable } from '../state/store.ts'

export interface SynthwerkAppOptions {
  /** Edge base URL, for example `https://api.example.com`. */
  apiUrl: string
  /**
   * The access token of the signed-in user, or `null`. Identity and llm calls send it.
   * See GetToken for `refresh`. Called only from effects and calls, never at import or render.
   */
  getToken: GetToken
  /** The app id (UUID) for widget tokens. Vision needs it; without it `useClassify` fails. */
  appId?: string
  /** Per-service base URLs (see SynthwerkOptions). */
  services?: { identity?: string; llm?: string; vision?: string }
  fetch?: (input: Request) => Promise<Response>
  tracing?: boolean
}

export type AuthStatus = 'unknown' | 'checking' | 'signed_in' | 'signed_out'

export interface AuthSnapshot {
  /** `unknown` until the first check (on mount). Never `signed_in` during SSR. */
  status: AuthStatus
  user: AuthUser | null
}

export interface SynthwerkApp {
  /** The one SDK client. It sends the user token. */
  sw: Synthwerk
  /** The sign-in state. */
  auth: Readable<AuthSnapshot>
  /** Asks `getToken` once and updates `auth`. Clears a previous signOut(). */
  checkAuth(): Promise<AuthUser | null>
  /** Stops all calls until checkAuth(), drops all user data (chats, widget token). */
  signOut(): void
  /** The host session changed (sign-in, sign-out, maybe another user): drop all user data, then check. */
  sessionChanged(): Promise<AuthUser | null>
  /** The widget-token session for vision, or `null` without `appId`. Built on first use. */
  widget(): WidgetSession | null
  /** Calls `listener` when user data must go: other user, sign-out, sessionChanged(). */
  onUserChange(listener: () => void): () => void
  /** Starts to follow `sw.auth` changes. Returns the stop function. Safe to call again. */
  connect(): () => void
}

export function createSynthwerkApp(options: SynthwerkAppOptions): SynthwerkApp {
  const sw = createSynthwerk({
    apiUrl: options.apiUrl,
    auth: { mode: 'token', getToken: options.getToken },
    ...(options.services ? { services: options.services } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.tracing === undefined ? {} : { tracing: options.tracing })
  })
  const auth = createStore<AuthSnapshot>({ status: 'unknown', user: null })
  const userListeners = new Set<() => void>()
  let session: WidgetSession | null = null
  /** The subject the app last saw. A change from one user to another (or to none) drops data. */
  let subject: string | null = null
  let check = 0
  let connections = 0
  let stopAuth: (() => void) | null = null

  function dropUserData(): void {
    session?.reset()
    for (const listener of [...userListeners]) listener()
  }

  function seen(user: AuthUser | null): void {
    const next = user?.subject ?? null
    // null -> user is a first sign-in: nothing to drop. user -> other or none: drop.
    if (subject !== null && next !== subject) dropUserData()
    subject = next
    auth.set({ status: user ? 'signed_in' : 'signed_out', user })
  }

  async function checkAuth(): Promise<AuthUser | null> {
    const mine = ++check
    if (auth.getSnapshot().status !== 'signed_in') auth.update({ status: 'checking' })
    let user: AuthUser | null = null
    try {
      user = await sw.auth.signIn()
    } catch {
      // A getToken that throws counts as signed out.
      user = null
    }
    if (mine === check) seen(user)
    return user
  }

  return {
    sw,
    auth,
    checkAuth,
    signOut() {
      check++
      sw.auth.signOut()
      subject = null
      dropUserData()
      auth.set({ status: 'signed_out', user: null })
    },
    sessionChanged() {
      dropUserData()
      return checkAuth()
    },
    widget() {
      if (!options.appId) return null
      session ??= createWidgetSession({
        apiUrl: options.apiUrl,
        appId: options.appId,
        getUserToken: () => options.getToken({ refresh: false }),
        ...(options.services ? { services: options.services } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {})
      })
      return session
    },
    onUserChange(listener) {
      userListeners.add(listener)
      return () => {
        userListeners.delete(listener)
      }
    },
    connect() {
      connections++
      stopAuth ??= sw.auth.onChange((user) => {
        // A request saw another user or a final 401. A running check reports itself.
        seen(user)
      })
      let stopped = false
      return () => {
        if (stopped) return
        stopped = true
        connections--
        if (connections === 0) {
          stopAuth?.()
          stopAuth = null
        }
      }
    }
  }
}
