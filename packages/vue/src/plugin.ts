// The plugin holds one SynthwerkApp (one SDK client) for the Vue app. Nothing here touches
// `window` or calls getToken at import or install: SSR renders `status: 'unknown'`.
import { createSynthwerkApp, type SynthwerkApp, type SynthwerkAppOptions } from '@synthwerk/sdk'
import { type App, type InjectionKey, inject, onScopeDispose, provide } from 'vue'

export const synthwerkKey: InjectionKey<SynthwerkApp> = Symbol('synthwerk')

/** Options of the one client, or an app from `createSynthwerkApp()`. */
export type SynthwerkInput = SynthwerkAppOptions | { app: SynthwerkApp }

function toApp(input: SynthwerkInput): SynthwerkApp {
  return 'app' in input ? input.app : createSynthwerkApp(input)
}

export interface SynthwerkPlugin {
  install(vue: App): void
  /** The app the plugin provides, for code outside components (router guards, stores). */
  readonly app: SynthwerkApp
}

/** `createApp(App).use(createSynthwerk({ apiUrl, getToken, appId }))`. */
export function createSynthwerk(input: SynthwerkInput): SynthwerkPlugin {
  const app = toApp(input)
  return {
    app,
    install(vue: App) {
      vue.provide(synthwerkKey, app)
      const stop = app.connect()
      vue.onUnmount(stop)
    }
  }
}

/** Provides an app to the subtree of the calling component (instead of the plugin). */
export function provideSynthwerk(input: SynthwerkInput): SynthwerkApp {
  const app = toApp(input)
  provide(synthwerkKey, app)
  onScopeDispose(app.connect())
  return app
}

/** The provided app. `useSynthwerk().sw` is the SDK client. */
export function useSynthwerk(): SynthwerkApp {
  const app = inject(synthwerkKey, null)
  if (!app) throw new Error('@synthwerk/vue: install createSynthwerk() or call provideSynthwerk()')
  return app
}
