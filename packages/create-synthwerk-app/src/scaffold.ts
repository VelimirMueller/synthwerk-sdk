// Copies a template into the target directory. npm drops dotfiles like `.gitignore` from a
// package, so the templates name them `_gitignore`; the copy renames `_x` to `.x`.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Template } from './args.ts'

/** The templates folder next to `src/` and `dist/`. */
export const templatesDir = fileURLToPath(new URL('../templates/', import.meta.url))

export interface ScaffoldOptions {
  /** Target directory, absolute or relative to `cwd`. */
  dir: string
  template: Template
  cwd: string
  apiUrl?: string | undefined
  appId?: string | undefined
  /** Source of the templates. Tests set it. */
  from?: string
}

export interface Scaffolded {
  root: string
  name: string
  files: string[]
}

/** A valid npm package name from a directory name (`My App!` → `my-app`). */
export function toPackageName(dir: string): string {
  const name = basename(resolve(dir))
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/-+$/, '')
  return name === '' ? 'synthwerk-app' : name.slice(0, 214)
}

/** `_gitignore` → `.gitignore`. Other names stay. */
export function targetName(name: string): string {
  return name.startsWith('_') ? `.${name.slice(1)}` : name
}

/** True when `dir` is missing or empty. A `.git` folder alone counts as empty. */
export function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) return true
  return readdirSync(dir).every((entry) => entry === '.git')
}

function copyTree(from: string, to: string, rel: string, files: string[]): void {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const source = join(from, entry.name)
    const name = targetName(entry.name)
    const dest = join(to, name)
    const path = rel ? `${rel}/${name}` : name
    if (entry.isDirectory()) copyTree(source, dest, path, files)
    else {
      cpSync(source, dest)
      files.push(path)
    }
  }
}

export function envLocal(apiUrl: string | undefined, appId: string | undefined): string | null {
  const lines: string[] = []
  if (apiUrl) lines.push(`VITE_SYNTHWERK_API_URL=${apiUrl}`)
  if (appId) lines.push(`VITE_SYNTHWERK_APP_ID=${appId}`)
  return lines.length ? `${lines.join('\n')}\n` : null
}

export function scaffold(options: ScaffoldOptions): Scaffolded {
  const root = resolve(options.cwd, options.dir)
  if (!isEmptyDir(root)) throw new Error(`${root} is not empty. Pick a new directory.`)
  const source = join(options.from ?? templatesDir, options.template)
  if (!existsSync(join(source, 'package.json'))) {
    throw new Error(`Template "${options.template}" is missing at ${source}`)
  }
  const files: string[] = []
  mkdirSync(dirname(root), { recursive: true })
  copyTree(source, root, '', files)

  const name = toPackageName(root)
  const manifestPath = join(root, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
  manifest.name = name
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const env = envLocal(options.apiUrl, options.appId)
  if (env) {
    writeFileSync(join(root, '.env.local'), env)
    files.push('.env.local')
  }
  return { root, name, files: files.sort() }
}
