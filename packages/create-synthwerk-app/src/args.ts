// Command-line flags of create-synthwerk-app. No dependency: node:util parseArgs.
import { parseArgs } from 'node:util'

export const templates = ['react', 'vue'] as const
export type Template = (typeof templates)[number]

export const DEFAULT_DIR = 'synthwerk-app'
export const DEFAULT_TEMPLATE: Template = 'react'

/** What the flags say. `undefined` means: not given, ask (interactive) or use the default. */
export interface Flags {
  dir: string | undefined
  template: Template | undefined
  apiUrl: string | undefined
  appId: string | undefined
  /** Link the packages of a synthwerk-sdk checkout instead of npm. */
  local: boolean
  /** The synthwerk-sdk checkout for `--local`. Default: the checkout this CLI runs from. */
  sdkDir: string | undefined
  install: boolean | undefined
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
      --app-id <uuid>         App id for vision, written to .env.local
      --install               Run pnpm install after the scaffold
      --no-install            Do not install (default without a terminal)
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
  if (values.install && values['no-install']) {
    return { kind: 'error', message: 'Use --install or --no-install, not both' }
  }
  if (values['sdk-dir'] !== undefined && !values.local) {
    return { kind: 'error', message: '--sdk-dir needs --local' }
  }
  const apiUrl = values['api-url']
  if (apiUrl !== undefined && !isHttpUrl(apiUrl)) {
    return { kind: 'error', message: `--api-url must be an http(s) URL, got: ${apiUrl}` }
  }
  return {
    kind: 'run',
    flags: {
      dir: positionals[0],
      template,
      apiUrl,
      appId: values['app-id'],
      local: values.local ?? false,
      sdkDir: values['sdk-dir'],
      install: values.install ? true : values['no-install'] ? false : undefined,
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
      'app-id': { type: 'string' },
      install: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      local: { type: 'boolean' },
      'sdk-dir': { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' }
    }
  })
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
