---
title: SDK core (sign-in, typed client, chat stream)
slug: sdk-core
status: beta
epic: E3
owner: sdk
paths: ["packages/sdk/src/**", "packages/sdk/scripts/**"]
api: ["GET /identity/v1/me", "GET /identity/v1/orgs", "POST /identity/v1/orgs", "GET /identity/v1/orgs/{orgId}", "POST /llm/v1/conversations", "GET /llm/v1/conversations/{id}", "POST /llm/v1/conversations/{id}/messages"]
events: []
mcp: []
updated: 2026-10-28
---

# SDK core (sign-in, typed client, chat stream)

> **In 30 seconds**
> - `@synthwerk/sdk` 0.1.0 is the framework-free core for the browser and Node 24.
> - Token mode: the host page or the widget hands in a token getter. The SDK never stores a token.
> - `sw.api` is a typed client generated from a pinned `synthwerk-contracts` commit.
> - `sw.llm.chat()` streams an answer as typed events and maps 401, quota, offline and stall errors.
> - The chat widget (#34) builds on this package. It has no own HTTP, auth or SSE code.

## What it does

- `createSynthwerk(options)` returns `{ auth, api, llm }`. This is the whole public surface of 0.1.0.
- Only `token` mode exists. PKCE comes in 0.2.0. TanStack adapters come in M5 (#51).
- The SDK calls `getToken` before every request. It keeps no token copy after the request.
- The SDK writes nothing to `localStorage`, `sessionStorage` or cookies (D-03).
- With no token, a call throws `unauthenticated` before any network call (D-30).
- On 401 it asks `getToken({ refresh: true })` once and retries once. Parallel 401s share one refresh.
- A second 401 ends the session: `onChange(null)`.
- `sw.api.identity` and `sw.api.llm` are `openapi-fetch` clients. Paths and bodies are typed from the contracts.
- `sw.llm.chat()` sends `POST /v1/conversations/{id}/messages` and reads the SSE answer with `fetch`.
- Chat events follow the contracts (D-44): `delta`, `usage`, `done`, `error`. Unknown event names are ignored.
- Service URLs default to the edge routes: `<apiUrl>/identity` and `<apiUrl>/llm`.

### Public API

| Export | Kind | Use |
|---|---|---|
| `createSynthwerk(options)` | function | Makes a client. |
| `Synthwerk`, `SynthwerkOptions` | type | The client and its options. |
| `GetToken`, `TokenAuthOptions`, `AuthOptions`, `Auth`, `AuthUser` | type | Token mode. |
| `ChatEvent`, `ChatRequest`, `ChatOptions`, `SendMessageRequest`, `Usage`, `FinishReason` | type | Chat stream. |
| `SynthwerkError`, `isSynthwerkError` | class, function | One error type. |
| `ErrorCode`, `ClientErrorCode`, `SynthwerkErrorInit` | type | Error codes. |
| `Conversation`, `Message`, `Problem`, `Me`, `Org`, `Role` | type | Contract schemas. |
| `LlmPaths`, `IdentityPaths` | type | Generated OpenAPI paths. |

| `sw.` member | Result |
|---|---|
| `auth.signIn()` | Clears a `signOut()`, asks `getToken` once, returns the user. |
| `auth.signOut()` | Every call fails with `unauthenticated` until `signIn()`. |
| `auth.getUser()` | `{ subject, expiresAt, claims }` from the JWT payload, or `null`. Not verified: the API verifies. |
| `auth.getAccessToken()` | The token from `getToken`, or `null`. |
| `auth.onChange(cb)` | `cb(user)` when the subject changes or the session ends. Returns unsubscribe. |
| `api.identity`, `api.llm` | `{ data, error, response }` per call. `error` is the problem body. |
| `llm.chat(req, { signal, stallTimeoutMs })` | `AsyncIterable<ChatEvent>`. |

## How to use

1. Install the package (workspace only in 0.1.0: not on npm yet).
2. Make a client with the token getter of the host:

   ```ts
   import { createSynthwerk, isSynthwerkError } from '@synthwerk/sdk'

   const sw = createSynthwerk({
     apiUrl: 'https://api.example.com',
     auth: { mode: 'token', getToken: ({ refresh }) => host.widgetToken({ refresh }) }
   })
   ```

3. Create a conversation with the typed client:

   ```ts
   const { data, error } = await sw.api.llm.POST('/v1/conversations', { body: {} })
   ```

4. Stream the answer. Switch on `event.type`:

   ```ts
   const controller = new AbortController()
   try {
     for await (const event of sw.llm.chat({ conversationId: data.id, content: text }, { signal: controller.signal })) {
       if (event.type === 'delta') answer += event.text
       if (event.type === 'error') show(event.error.code)   // stream ends after it
     }
   } catch (e) {
     if (isSynthwerkError(e)) show(e.code)                 // refused before the first byte
   }
   ```

5. Stop an answer with `controller.abort()`, or `break` the loop. Both close the connection.
6. Move the contracts pin: change `commit` in `packages/sdk/contracts/contracts.lock.json`, run `pnpm --filter @synthwerk/sdk codegen:sync <contracts clone>`, commit the specs and `src/generated/`.

## Rules and limits

| Rule | Value |
|---|---|
| Auth modes | `token` only (PKCE in 0.2.0) |
| Token storage | memory of one request; never storage or cookies |
| 401 retry | one refresh, one retry; parallel 401s share one refresh |
| Stall timeout | 45 s without bytes (3 missed 15 s pings), option `stallTimeoutMs` |
| Chat auto-retry | none: the server stores the message, a retry sends it twice |
| Reconnect | none for chat in M2 (POST, not resumable). `retryable` and `retryAfter` tell the UI when to offer a retry. |
| `traceparent`, `X-Request-ID` | off by default (`tracing: true`): the edge CORS allows only `Authorization` and `Content-Type` |
| `Idempotency-Key` | not sent: the gateway and the edge CORS do not support it yet |
| Bundle size | 6.9 KB gzip (core + token auth + chat, minified ESM); budget 12 KB |
| Contracts pin | `synthwerk-contracts` `4991c3a737f63d53483d572c2208be17a68a4d77` |

## Events

| Type | When |
|---|---|
| None. | The SDK emits no CloudEvents. Chat SSE events are in "What it does". |

## Errors

Every failure is a `SynthwerkError` with `code`, `status`, `title`, `detail`, `traceId`, `retryAfter`, `retryable`.

| Status | Problem type | Cause |
|---|---|---|
| 401 | `unauthenticated` | No token, `signOut()`, or 401 after one refresh. Also thrown before any network call. |
| 429 | `quota_exhausted` | Server code, passed through with `retryAfter`. Not retryable. |
| 429 | `too_many_streams` | Server code. Retryable. |
| 503 | `model_unavailable` | Server code, before the first byte (thrown) or as an `error` event. Retryable. |
| any | any other server `code` | Passed through as it is. Clients must accept unknown codes. |
| none | `offline` | `fetch` failed while `navigator.onLine` is `false`. Retryable. |
| none | `network` | `fetch` or the body read failed. Retryable. |
| none | `aborted` | `sw.api` call aborted. A chat abort ends the iteration quietly instead. |
| 200 | `stream_stalled` | No bytes for the stall timeout. `error` event. Retryable. |
| 200 | `stream_interrupted` | Body ended without `done` or `error`. `error` event. Retryable. |
| 200 | `invalid_event` | Known event name with bad JSON or fields. `error` event, stream ends. |
| 5xx, other | `bad_gateway` | Non-JSON error body (a proxy page), or 200 without `text/event-stream`. The body never reaches the error. |

## Tests

- `tests/unit/sdk/auth.test.ts` — `singleFlight - three parallel 401 - one refresh, three retries`
- `tests/unit/sdk/auth.test.ts` — `singleFlight - refresh fails - all three reject with unauthenticated`
- `tests/unit/sdk/auth.test.ts` — `auth - token mode - token never written to any storage`
- `tests/unit/sdk/auth.test.ts` — `onChange - sign-in, sign-out - listener gets the user, then null`
- `tests/unit/sdk/auth.test.ts` — `transport - second 401 - onChange(null), 401 response returned`
- `tests/unit/sdk/chat.test.ts` — `parseSse - event split across two chunks - one event`
- `tests/unit/sdk/chat.test.ts` — `chat - heartbeat comment only - no events, stream stays open`
- `tests/unit/sdk/chat.test.ts` — `chat - unknown event name - ignored, later events delivered`
- `tests/unit/sdk/chat.test.ts` — `chat - malformed JSON data - error event invalid_event, stream ends`
- `tests/unit/sdk/chat.test.ts` — `chat - abort mid-stream - iteration ends, fetch aborted`
- `tests/unit/sdk/chat.test.ts` — `chat - no bytes for 45 s (fake timers) - error event stream_stalled`
- `tests/unit/sdk/chat.test.ts` — `chat - no token - throws unauthenticated, fetch not called`
- `tests/unit/sdk/chat.test.ts` — `chat - 429 quota_exhausted before the first byte - throws with retryAfter`
- `tests/unit/sdk/chat.test.ts` — `types - ChatEvent narrows on type; api rejects unknown paths`
- `tests/unit/sdk/errors.test.ts` — `fromResponse - problem+json with code - SynthwerkError.code equals server code`
- `tests/unit/sdk/errors.test.ts` — `fromResponse - HTML 502 body - code bad_gateway, body not in message`
- `tests/unit/sdk/errors.test.ts` — `fromFetchFailure - TypeError while navigator is offline - code offline`
- `tests/unit/sdk/transport.test.ts` — `api - create conversation - POST to <apiUrl>/llm with bearer, typed data`
- `tests/unit/sdk/codegen.test.ts` — `src/generated/*.ts - regenerated - no drift`
- `tests/integration/sdk/chat.test.ts` — `chat - mock gateway streams 20 tokens then done - text equals joined tokens`
- `tests/integration/sdk/chat.test.ts` — `chat - 401 then new token - request retried once`
- `tests/integration/sdk/chat.test.ts` — `chat - gateway sends error event after 3 tokens - 3 tokens then error, no retry`
- `tests/integration/sdk/chat.test.ts` — `chat - abort mid-stream - server sees the connection close`
- Mock gateway for #34: `tests/support/mock-gateway.ts` (Node `http`, SSE and problem+json, edge paths).

## Changes

| Date | Change |
|---|---|
| 2026-10-28 | First version (#35): token mode, typed client from contracts `4991c3a`, chat stream. |
