// The CLI flow: flags → questions (terminal only) → scaffold → optional local packages and
// install → next steps. All side effects come in through `RunIo`, so tests run it in-process.
import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { createInterface } from 'node:readline/promises'
import {
  DEFAULT_DIR,
  DEFAULT_TEMPLATE,
  type Flags,
  isTemplate,
  parseFlags,
  type Template,
  templates,
  usage
} from './args.ts'
import { type Exec, execSync, findCheckout, linkLocal } from './local.ts'
import { scaffold } from './scaffold.ts'

export type Ask = (question: string, fallback: string) => Promise<string>

export interface RunIo {
  cwd: string
  log(line: string): void
  error(line: string): void
  /** `null` when there is no terminal: the CLI then asks nothing. */
  ask: Ask | null
  exec: Exec
}

export const version: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
).version

/** Fills what the flags leave open: asks in a terminal, else takes the defaults. */
export async function resolve(
  flags: Flags,
  ask: Ask | null
): Promise<{ dir: string; template: Template }> {
  const asking = flags.yes ? null : ask
  const dir = flags.dir ?? (asking ? await asking('Project directory', DEFAULT_DIR) : DEFAULT_DIR)
  let template = flags.template
  while (template === undefined) {
    const answer = asking
      ? (await asking(`Template (${templates.join(' or ')})`, DEFAULT_TEMPLATE)).toLowerCase()
      : DEFAULT_TEMPLATE
    if (isTemplate(answer)) template = answer
  }
  return { dir: dir.trim() === '' ? DEFAULT_DIR : dir.trim(), template }
}

/** Runs the CLI. Returns the exit code. */
export async function run(argv: readonly string[], io: RunIo): Promise<number> {
  const parsed = parseFlags(argv)
  if (parsed.kind === 'help') {
    io.log(usage)
    return 0
  }
  if (parsed.kind === 'version') {
    io.log(version)
    return 0
  }
  if (parsed.kind === 'error') {
    io.error(parsed.message)
    io.error('Run with --help for the options.')
    return 2
  }
  const { flags } = parsed
  let created: string | null = null
  try {
    const checkout = flags.local ? findCheckout(flags.sdkDir, io.cwd) : null
    const { dir, template } = await resolve(flags, io.ask)
    const app = scaffold({
      dir,
      template,
      cwd: io.cwd,
      env: {
        apiUrl: flags.apiUrl,
        authUrl: flags.authUrl,
        clientId: flags.clientId,
        projectId: flags.projectId
      }
    })
    created = app.root
    io.log(`Created ${app.name} (${template}) in ${app.root}`)
    if (checkout) {
      const packages = linkLocal(app.root, template, checkout, io.exec)
      io.log(`Packed ${packages.map((p) => `${p.name}@${p.version}`).join(', ')} from ${checkout}`)
    }
    if (flags.install) {
      io.log('Installing with pnpm …')
      io.exec('pnpm', ['install'], app.root)
    }
    const near = relative(io.cwd, app.root)
    const cd = near === '' ? '.' : near.startsWith('..') ? app.root : near
    io.log('')
    io.log('Next steps:')
    io.log(`  cd ${cd.includes(' ') ? JSON.stringify(cd) : cd}`)
    if (!flags.install) io.log('  pnpm install')
    io.log('  Fill in .env.local (see .env.example), then: pnpm dev')
    if (!checkout) {
      io.log('')
      io.log('Note: the @synthwerk/* packages are not on npm yet. Until then, scaffold with')
      io.log('--local from a built synthwerk-sdk checkout.')
    }
    return 0
  } catch (error) {
    io.error((error as Error).message)
    if (created) io.error(`The app is not complete. Delete ${created} before you try again.`)
    return 1
  }
}

/** A question on the terminal; an empty answer takes the fallback. */
export function terminalAsk(): Ask {
  return async (question, fallback) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      const answer = await rl.question(`${question} (${fallback}): `)
      return answer.trim() === '' ? fallback : answer.trim()
    } finally {
      rl.close()
    }
  }
}

export function processIo(): RunIo {
  return {
    cwd: process.cwd(),
    log: (line) => console.log(line),
    error: (line) => console.error(line),
    ask: process.stdin.isTTY && process.stdout.isTTY ? terminalAsk() : null,
    exec: execSync
  }
}
