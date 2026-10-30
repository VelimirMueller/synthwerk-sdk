// The provider holds one SynthwerkApp (one SDK client) for the tree. Nothing here touches
// `window` or calls getToken at import or render: SSR renders `status: 'unknown'`.
import { createSynthwerkApp, type SynthwerkApp, type SynthwerkAppOptions } from '@synthwerk/sdk'
import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

const SynthwerkContext = createContext<SynthwerkApp | null>(null)

export type SynthwerkProviderProps =
  | {
      /**
       * Options of the one client. Read once on mount; `getToken` may change between
       * renders (the latest one is used). Give the provider a new `key` for another `apiUrl`.
       */
      options: SynthwerkAppOptions
      app?: never
      children?: ReactNode
    }
  | {
      /** An app from `createSynthwerkApp()`, for example shared with code outside React. */
      app: SynthwerkApp
      options?: never
      children?: ReactNode
    }

export function SynthwerkProvider(props: SynthwerkProviderProps): ReactElement {
  const options = useRef(props.options)
  useEffect(() => {
    options.current = props.options
  })
  const [app] = useState<SynthwerkApp>(() => {
    if (props.app) return props.app
    const initial = props.options
    if (!initial)
      throw new TypeError('@synthwerk/react: SynthwerkProvider needs `options` or `app`')
    return createSynthwerkApp({
      ...initial,
      getToken: (request) => (options.current ?? initial).getToken(request)
    })
  })
  useEffect(() => app.connect(), [app])
  return createElement(SynthwerkContext.Provider, { value: app }, props.children)
}

/** The app of the nearest SynthwerkProvider. `useSynthwerk().sw` is the SDK client. */
export function useSynthwerk(): SynthwerkApp {
  const app = useContext(SynthwerkContext)
  if (!app) throw new Error('@synthwerk/react: wrap the component in <SynthwerkProvider>')
  return app
}
