// Command-line flags of create-synthwerk-app. No dependency: node:util parseArgs.
import { parseArgs } from 'node:util'

export const templates = ['react', 'vue'] as const
export type Template = (typeof templates)[number]

export const DEFAULT_DIR = 'synthwerk-app'
export const DEFAULT_TEMPLATE: Template = 'react'

/** The values the scaffold writes to `.env.local`. All optional. */
export interface EnvValues {
  apiUrl?: string | undefined
  authUrl?: string | undefined
  clientId?: string | undefined
  projectId?: string | undefined
}

/** What the flags say. `undefined` means: not given, ask (terminal) or use the default. */
export interface Flags extends EnvValues {
  dir: string | undefined
  template: Template | undefined
  /** Pack the packages of a synthwerk-sdk checkout instead of npm. */
  local: boolean
  /** The synthwerk-sdk checkout for `--local`. Default: the checkout this CLI runs from. */
  sdkDir: string | undefined
  /** Run `pnpm install` after the scaffold. */
  install: boolean
  /** Never ask: use defaults for what the flags leave open. */
  yes: boolean
}

export type Parsed =
  | { kind: 'run'; flags: Flags }
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'error'; message: string }

export const usage = `Usage: pnpm create synthwerk-app [dir] [options]

Options:
  -t, --template <react|vue>  App template (default: react)
      --api-url <url>         Edge base URL, written to .env.local
      --auth-url <url>        OIDC issuer (Zitadel), written to .env.local
      --client-id <id>        OIDC client id of the app, written to .env.local
      --project-id <id>       Zitadel project id (API audience), written to .env.local
      --install               Run pnpm install after the scaffold
      --local                 Use the packages of a synthwerk-sdk checkout, not npm
      --sdk-dir <path>        The checkout for --local (default: the one this CLI runs from)
  -y, --yes                   Ask nothing; use defaults for missing options
  -h, --help                  Show this help
  -v, --version               Show the version

Without a terminal (CI) or with --yes the CLI asks nothing.`

export function isTemplate(value: string): value is Template {
  return (templates as readonly string[]).includes(value)
}

export function parseFlags(argv: readonly string[]): Parsed {
  let values: ReturnType<typeof read>['values']
  let positionals: string[]
  try {
    ;({ values, positionals } = read(argv))
  } catch (error) {
    return { kind: 'error', message: (error as Error).message }
  }
  if (values.help) return { kind: 'help' }
  if (values.version) return { kind: 'version' }
  if (positionals.length > 1) {
    return { kind: 'error', message: `One directory only, got: ${positionals.join(' ')}` }
  }
  const template = values.template
  if (template !== undefined && !isTemplate(template)) {
    return {
      kind: 'error',
      message: `Unknown template "${template}". Use one of: ${templates.join(', ')}`
    }
  }
  if (values['sdk-dir'] !== undefined && !values.local) {
    return { kind: 'error', message: '--sdk-dir needs --local' }
  }
  for (const flag of ['api-url', 'auth-url'] as const) {
    const value = values[flag]
    if (value !== undefined && !isHttpUrl(value)) {
      return { kind: 'error', message: `--${flag} must be an http(s) URL, got: ${value}` }
    }
  }
  for (const flag of ['client-id', 'project-id'] as const) {
    const value = values[flag]
    if (value !== undefined && !/^[\w.-]+$/.test(value)) {
      return { kind: 'error', message: `--${flag} may hold letters, digits, ".", "_", "-" only` }
    }
  }
  return {
    kind: 'run',
    flags: {
      dir: positionals[0],
      template,
      apiUrl: values['api-url'],
      authUrl: values['auth-url'],
      clientId: values['client-id'],
      projectId: values['project-id'],
      local: values.local ?? false,
      sdkDir: values['sdk-dir'],
      install: values.install ?? false,
      yes: values.yes ?? false
    }
  }
}

function read(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      template: { type: 'string', short: 't' },
      'api-url': { type: 'string' },
      'auth-url': { type: 'string' },
      'client-id': { type: 'string' },
      'project-id': { type: 'string' },
      install: { type: 'boolean' },
      local: { type: 'boolean' },
      'sdk-dir': { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' }
    }
  })
}

/** True for an absolute http or https URL. A newline can never pass (it ends the env line). */
export function isHttpUrl(value: string): boolean {
  if (/\s/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
