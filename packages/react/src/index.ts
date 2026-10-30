// @synthwerk/react 0.1.0: the public surface. No UI components.
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
} from './hooks.ts'
export { SynthwerkProvider, type SynthwerkProviderProps, useSynthwerk } from './provider.ts'
