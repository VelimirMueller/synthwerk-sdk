// CI check of the templates (synthwerk#52): for each template, run the built CLI with
// --local (the @synthwerk/* packages packed from this checkout), install, then typecheck,
// test and build the new app. Needs `pnpm build` first and network for npm.
// Usage: node scripts/check-templates.ts [react|vue ...] [--keep]
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const templates = ['react', 'vue']
const pkgDir = fileURLToPath(new URL('../', import.meta.url))
const cli = join(pkgDir, 'dist', 'cli.js')

function step(command: string, args: string[], cwd: string): void {
  console.log(`\n$ ${command} ${args.join(' ')}   (in ${cwd})`)
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status})`)
  }
}

const args = process.argv.slice(2)
const keep = args.includes('--keep')
const wanted = args.filter((arg) => arg !== '--keep')
const unknown = wanted.filter((name) => !templates.includes(name))
if (unknown.length > 0) {
  console.error(`Unknown template: ${unknown.join(', ')}. Use: ${templates.join(', ')}`)
  process.exit(2)
}
if (!existsSync(cli)) {
  console.error(`${cli} is missing. Run pnpm build first.`)
  process.exit(2)
}

// Outside the synthwerk-sdk workspace, so pnpm treats each app as its own project.
const root = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'create-synthwerk-app-'))
let failed = false
try {
  for (const template of wanted.length > 0 ? wanted : templates) {
    const app = join(root, `${template}-app`)
    step('node', [cli, app, '--template', template, '--local', '--yes'], root)
    // A new app has no lockfile; pnpm in CI defaults to --frozen-lockfile.
    step('pnpm', ['install', '--no-frozen-lockfile'], app)
    step('pnpm', ['run', 'typecheck'], app)
    step('pnpm', ['run', 'test'], app)
    step('pnpm', ['run', 'build'], app)
    console.log(`\nok: ${template}`)
  }
} catch (error) {
  failed = true
  console.error(`\n${(error as Error).message}`)
} finally {
  if (keep) console.log(`\nKept the apps in ${root}`)
  else rmSync(root, { recursive: true, force: true })
}
process.exitCode = failed ? 1 : 0
