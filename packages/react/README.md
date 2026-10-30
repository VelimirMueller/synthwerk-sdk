# @synthwerk/react

React 18.3+ and 19 adapter of the Synthwerk SDK. One provider holds one SDK client; hooks give sign-in state, a streamed chat and vision classification. No UI components.

```tsx
import { SynthwerkProvider, useAuth, useChat, useClassify } from '@synthwerk/react'

<SynthwerkProvider options={{ apiUrl: 'https://api.example.com', appId, getToken }}>
  <App />
</SynthwerkProvider>

const { status, user, signIn, signOut, sessionChanged } = useAuth()
const { messages, streaming, error, failedText, send, stop } = useChat()
const { status, data, error, classify } = useClassify()
```

- `getToken({ refresh })` returns the user's access token or `null`. The SDK stores no token.
- SSR safe: no `window` at import, no `getToken` call on the server. `status` is `unknown` until mount.
- Unmount aborts a running stream or classification. A user switch or sign-out clears chats and the widget token.
- `error.kind` is `quota` (with `resetsAt`), `not_allowed` (403, origin), `signed_out`, `offline`, `busy`, …
- TanStack Query: `meQuery(app)`, `conversationQuery(app, id)` and `classifyMutation(app)` fit `useQuery` / `useMutation`; `app = useSynthwerk()`.

Example: [examples/react](../../examples/react/main.tsx). Reference: [docs/features/sdk-adapters.md](../../docs/features/sdk-adapters.md). Not on npm yet.
