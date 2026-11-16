// App settings from `.env.local`. Vite gives the app every `VITE_*` value. See `.env.example`.

export interface AppConfig {
  /** Edge base URL. The SDK calls `<apiUrl>/identity` and `<apiUrl>/llm`. */
  apiUrl: string
  /** OIDC issuer (Zitadel), for example `https://auth.example.com`. */
  authUrl: string
  /** OIDC client id of this app (a Zitadel "user agent" app with PKCE). */
  clientId: string
  /** Zitadel project id of the Synthwerk API. Adds the API audience and role scopes. */
  projectId: string | undefined
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; missing: string[] }

type Env = Record<string, string | boolean | undefined>

const required = {
  apiUrl: 'VITE_SYNTHWERK_API_URL',
  authUrl: 'VITE_SYNTHWERK_AUTH_URL',
  clientId: 'VITE_SYNTHWERK_CLIENT_ID'
} as const

function text(env: Env, name: string): string {
  const value = env[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Reads the settings. Lists every missing value, so the start page can name them. */
export function readConfig(env: Env = import.meta.env): ConfigResult {
  const missing = Object.values(required).filter((name) => text(env, name) === '')
  if (missing.length > 0) return { ok: false, missing }
  const projectId = text(env, 'VITE_SYNTHWERK_PROJECT_ID')
  return {
    ok: true,
    config: {
      apiUrl: text(env, required.apiUrl),
      authUrl: text(env, required.authUrl),
      clientId: text(env, required.clientId),
      projectId: projectId === '' ? undefined : projectId
    }
  }
}
