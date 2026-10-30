---
title: SDK adapters for React and Vue
slug: sdk-adapters
status: beta
epic: E7
owner: sdk
paths: ["packages/react/src/**", "packages/vue/src/**", "packages/sdk/src/app/**", "packages/sdk/src/state/**", "packages/sdk/src/identity/widget-session.ts"]
api: ["GET /identity/v1/me", "POST /identity/v1/apps/{appId}/widget-tokens", "POST /llm/v1/conversations", "GET /llm/v1/conversations/{id}", "POST /llm/v1/conversations/{id}/messages", "POST /vision/v1/classifications"]
events: []
mcp: []
updated: 2026-10-30
---

# SDK adapters for React and Vue

> **In 30 seconds**
> - `@synthwerk/react` 0.1.0 and `@synthwerk/vue` 0.1.0 bind the SDK core to React and Vue.
> - One provider (React) or plugin (Vue) holds one SDK client for the app.
> - Hooks and composables: `useAuth`, `useChat` (token by token), `useClassify` (vision).
> - The logic is in `@synthwerk/sdk` 0.3.0. The adapters only bind its stores. No UI.
> - SSR safe, tree-shakable (`sideEffects: false`), typed. `create-synthwerk-app` (#52) builds on them.

## What it does

- `createSynthwerkApp(options)` (core) makes one client with the user token and the sign-in state.
- `SynthwerkProvider` (React) and `createSynthwerk()` / `provideSynthwerk()` (Vue) hold one app.
- `useAuth()`: `status` (`unknown`, `checking`, `signed_in`, `signed_out`), `user`, `signIn`, `signOut`, `sessionChanged`.
- `useChat(options?)`: `messages`, `streaming`, `error`, `usage`, `failedText`, `conversationId`, `send`, `stop`, `dismiss`, `reset`.
- The last assistant message grows with each `delta` event. Each change is a new immutable snapshot.
- `useClassify()`: `status` (`idle`, `pending`, `success`, `error`), `data`, `error`, `classify(blob)`, `reset`.
- Vision needs a widget token. The app trades the user token for it through `createWidgetSession()` (core).
- `error` is an `ErrorState`: `kind`, `code`, and for `quota` the `resetsAt` and `quota` members.
- TanStack Query: `meQuery(app)`, `conversationQuery(app, id)` and `classifyMutation(app)` are plain option objects. They fit `@tanstack/react-query` and `@tanstack/vue-query` without a dependency.
- Streams stay in the chat store: a query cache does not fit a token stream.

### Session rules (from synthwerk-widgets)

- The cached widget token belongs to one user token. Another user token gets a new trade.
- One trade per user token at a time. Parallel calls with the same user token share it.
- A user switch, `signOut()` or `sessionChanged()` drops the widget token and clears every chat and classification.
- A trade or a stream that started before the drop never writes into the new state.
- A first sign-in (no user to a user) drops nothing.

## How to use

1. React: wrap the app.

   ```tsx
   <SynthwerkProvider options={{ apiUrl, appId, getToken: ({ refresh }) => auth.token({ refresh }) }}>
     <App />
   </SynthwerkProvider>
   ```

2. Vue: install the plugin.

   ```ts
   createApp(App).use(createSynthwerk({ apiUrl, appId, getToken })).mount('#app')
   ```

3. Read the state in a component: `const chat = useChat()`, then `chat.send(text)`.
4. Tell the app when the host session changes: `useAuth().sessionChanged()`.
5. TanStack Query: `useQuery(meQuery(useSynthwerk()))`. Drop the cache on a user switch: `app.onUserChange(() => queryClient.removeQueries({ queryKey: synthwerkKeys.all }))`.
6. Examples: `examples/react/main.tsx`, `examples/vue/main.ts` and `examples/vue/App.vue`.

## Rules and limits

| Rule | Value |
|---|---|
| React | `^18.3.0 \|\| ^19.0.0` (peer) |
| Vue | `^3.5.0` (peer) |
| Core | `@synthwerk/sdk` `^0.3.0` (dependency) |
| Import and server render | no `window`, no `getToken` call; `status` stays `unknown` |
| First token check | on mount (React effect, Vue `onMounted`); in a bare effect scope at once |
| Unmount | aborts the stream (partial answer `stopped`) and a running classification (back to `idle`) |
| Send while streaming | ignored |
| Chat auto-retry | none (the server stores the message) |
| Classify | latest call wins; the older one is aborted |
| Widget token refresh | 30 s before expiry |
| Provider options | read once; the latest `getToken` is used. A new `apiUrl` needs a new provider `key` |
| Token storage | memory only; no storage, no cookie |

## Events

| Type | When |
|---|---|
| None. | The adapters emit no CloudEvents. |

## Errors

Every failure lands in `error` as an `ErrorState`. `send()` and `classify()` never reject.

| Status | Problem type | Cause |
|---|---|---|
| 401 | `unauthenticated` → `signed_out` | No user token, sign-out, identity 401 on the trade, or 401 after one refresh. |
| 403 | `forbidden`, `origin_not_allowed` → `not_allowed` | Token scope, role or page origin not allowed. |
| 429 | `quota_exhausted` → `quota` | `resetsAt` from `quota.resets_at`, else from `Retry-After`. |
| 429, 503 | `too_many_streams`, `rate_limited`, `model_unavailable` → `busy` | Try again later. |
| 413, 415, 507 | `input_too_large`, `unsupported_media_type`, `storage_full` | Vision status codes (FastAPI bodies). |
| 200 | `stream_stalled`, `stream_interrupted` → `interrupted` | After the answer started. |
| none | `offline` | The browser is offline. |
| any | other → `generic` | Includes `empty_answer` (done without text) and `classify` without `appId`. |

## Tests

- `tests/unit/sdk/widget-session.test.ts` — `other user token - cached widget token is not reused - new trade`
- `tests/unit/sdk/widget-session.test.ts` — `reset during a trade - the old trade never fills the cache`
- `tests/unit/sdk/app.test.ts` — `user switch - drops the widget token and tells listeners; first sign-in does not`
- `tests/unit/sdk/chat-store.test.ts` — `send - tokens arrive one by one in the assistant message, then done`
- `tests/unit/sdk/chat-store.test.ts` — `user change during a stream - chat cleared, the old stream never writes again`
- `tests/unit/sdk/classify-store.test.ts` — `403 wrong origin (FastAPI body) - error not_allowed`
- `tests/unit/sdk/queries.test.ts` — `meQuery - key has the user subject; data from identity` (real TanStack QueryClient)
- `tests/unit/react/adapter.test.ts` — `useChat - unmount aborts the open stream`
- `tests/unit/react/adapter.test.ts` — `user switch - sessionChanged with another user clears the chat`
- `tests/unit/vue/adapter.test.ts` — `useChat - quota and origin errors map to quota and not_allowed`
- `tests/unit/adapters/ssr.test.ts` — `react renderToString - status unknown, getToken never called`
- `tests/unit/adapters/ssr.test.ts` — `vue renderToString - status unknown, getToken never called`

## Changes

| Date | Change |
|---|---|
| 2026-10-30 | First version (#51): `@synthwerk/react` 0.1.0, `@synthwerk/vue` 0.1.0, `@synthwerk/sdk` 0.3.0. |
