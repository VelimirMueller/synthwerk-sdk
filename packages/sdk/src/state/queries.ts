// TanStack Query options for the typed reads, without a TanStack dependency: the objects fit
// `useQuery` / `useMutation` of @tanstack/react-query and @tanstack/vue-query alike.
// Streams stay in createChatStore: a query cache does not fit a token stream.
// Keys start with the user subject, so one user never reads another user's cached data.
// The subject is read when the factory runs: build the options during render (React) or in
// a computed (Vue), so a sign-in gives a new key.
// On a user switch drop them all: `app.onUserChange(() => queryClient.removeQueries({ queryKey: synthwerkKeys.all }))`.
import type { SynthwerkApp } from '../app/app.ts'
import { errorFromResult } from '../client/errors.ts'
import type { components as IdentityComponents } from '../generated/identity.ts'
import type { components as LlmComponents } from '../generated/llm.ts'
import type { components as VisionComponents } from '../generated/vision.ts'

type Me = IdentityComponents['schemas']['Me']
type Conversation = LlmComponents['schemas']['Conversation']
type Classification = VisionComponents['schemas']['Classification']

export const synthwerkKeys = {
  all: ['synthwerk'] as const,
  /** Everything cached for one user (`null`: before the first sign-in check). */
  user: (subject: string | null) => ['synthwerk', subject] as const,
  me: (subject: string | null) => ['synthwerk', subject, 'identity', 'me'] as const,
  conversation: (subject: string | null, id: string) =>
    ['synthwerk', subject, 'llm', 'conversation', id] as const,
  classify: ['synthwerk', 'vision', 'classify'] as const
}

export interface SynthwerkQuery<T, K extends readonly unknown[]> {
  queryKey: K
  queryFn: (context: { signal: AbortSignal }) => Promise<T>
}

export interface SynthwerkMutation<T, V> {
  mutationKey: readonly unknown[]
  mutationFn: (variables: V) => Promise<T>
}

type Source = Pick<SynthwerkApp, 'sw' | 'auth'>

function subjectOf(app: Source): string | null {
  return app.auth.getSnapshot().user?.subject ?? null
}

/** `GET /identity/v1/me`: the caller with orgs and roles. Errors are SynthwerkErrors. */
export function meQuery(app: Source): SynthwerkQuery<Me, ReturnType<typeof synthwerkKeys.me>> {
  return {
    queryKey: synthwerkKeys.me(subjectOf(app)),
    async queryFn({ signal }) {
      const { data, error, response } = await app.sw.api.identity.GET('/v1/me', { signal })
      if (!data) throw errorFromResult(error, response)
      return data
    }
  }
}

/** `GET /llm/v1/conversations/{id}`: one conversation with its messages. */
export function conversationQuery(
  app: Source,
  id: string
): SynthwerkQuery<Conversation, ReturnType<typeof synthwerkKeys.conversation>> {
  return {
    queryKey: synthwerkKeys.conversation(subjectOf(app), id),
    async queryFn({ signal }) {
      const { data, error, response } = await app.sw.api.llm.GET('/v1/conversations/{id}', {
        params: { path: { id } },
        signal
      })
      if (!data) throw errorFromResult(error, response)
      return data
    }
  }
}

/** Vision classification as a mutation (widget token; needs `appId`). */
export function classifyMutation(
  app: Pick<SynthwerkApp, 'widget'>
): SynthwerkMutation<Classification, Blob> {
  return {
    mutationKey: synthwerkKeys.classify,
    async mutationFn(image) {
      const widget = app.widget()
      if (!widget) throw new TypeError('@synthwerk/sdk: classify needs an appId (widget token)')
      const { data, error, response } = await widget.sw.api.vision.POST('/v1/classifications', {
        body: { image }
      })
      if (!data) throw errorFromResult(error, response)
      return data
    }
  }
}
