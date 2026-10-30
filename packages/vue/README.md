# @synthwerk/vue

Vue 3.5 adapter of the Synthwerk SDK. One plugin holds one SDK client; composables give sign-in state, a streamed chat and vision classification. No UI components (see `@synthwerk/ui-vue`).

```ts
import { createSynthwerk, useAuth, useChat, useClassify } from '@synthwerk/vue'

createApp(App).use(createSynthwerk({ apiUrl: 'https://api.example.com', appId, getToken })).mount('#app')

const { status, user, signIn, signOut, sessionChanged } = useAuth()
const { messages, streaming, error, failedText, send, stop } = useChat()
const { status, data, error, classify } = useClassify()
```

- Every state field is a read-only `ComputedRef`. `provideSynthwerk()` provides an app to one subtree.
- `getToken({ refresh })` returns the user's access token or `null`. The SDK stores no token.
- SSR safe: no `window` at import, no `getToken` call on the server. `status` is `unknown` until mount.
- Scope dispose (unmount) aborts a running stream or classification. A user switch or sign-out clears chats and the widget token.
- `error.kind` is `quota` (with `resetsAt`), `not_allowed` (403, origin), `signed_out`, `offline`, `busy`, …
- TanStack Query: `meQuery(app)`, `conversationQuery(app, id)` and `classifyMutation(app)` fit `useQuery` / `useMutation` of `@tanstack/vue-query`; `app = useSynthwerk()`.

Example: [examples/vue](../../examples/vue/App.vue). Reference: [docs/features/sdk-adapters.md](../../docs/features/sdk-adapters.md). Not on npm yet.
