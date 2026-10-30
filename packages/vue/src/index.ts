// @synthwerk/vue 0.1.0: the public surface. No UI components.
export type {
  AuthSnapshot,
  AuthStatus,
  AuthUser,
  ChatMessage,
  ChatMessageStatus,
  ChatSnapshot,
  ChatStoreOptions,
  Classification,
  ClassifySnapshot,
  ClassifyStatus,
  ErrorKind,
  ErrorState,
  GetToken,
  SynthwerkApp,
  SynthwerkAppOptions
} from '@synthwerk/sdk'
export {
  classifyMutation,
  conversationQuery,
  createSynthwerkApp,
  meQuery,
  type SynthwerkMutation,
  type SynthwerkQuery,
  synthwerkKeys
} from '@synthwerk/sdk'
export {
  type UseAuth,
  type UseChat,
  type UseClassify,
  useAuth,
  useChat,
  useClassify
} from './composables.ts'
export {
  createSynthwerk,
  provideSynthwerk,
  type SynthwerkInput,
  type SynthwerkPlugin,
  synthwerkKey,
  useSynthwerk
} from './plugin.ts'
