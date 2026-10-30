// `--local`: the @synthwerk/* packages are not on npm yet (synthwerk-sdk#20). This mode packs
// them from a synthwerk-sdk checkout with `pnpm pack` (the same files npm would serve) into
// `<app>/.synthwerk/` and points pnpm `overrides` at the tarballs. To move to npm later,
// delete the overrides block in pnpm-workspace.yaml and the `.synthwerk/` folder.
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Template } from './args.ts'

/** The workspace packages each template uses, by folder under `packages/`. */
export const localPackages: Record<Template, readonly string[]> = {
  react: ['sdk', 'react', 'tokens'],
  vue: ['sdk', 'vue', 'tokens', 'ui-vue']
}

export const LOCAL_DIR = '.synthwerk'
export const OVERRIDES_MARKER = '# create-synthwerk-app --local'

export interface PackageInfo {
  name: string
  version: string
  dir: string
}

/** The checkout this CLI runs from (`packages/create-synthwerk-app/{src,dist}` → repo root). */
export const ownCheckout = fileURLToPath(new URL('../../../', import.meta.url))

/** True when `dir` is a synthwerk-sdk checkout (it has packages/sdk named @synthwerk/sdk). */
export function isSdkCheckout(dir: string): boolean {
  const manifest = join(dir, 'packages', 'sdk', 'package.json')
  if (!existsSync(manifest)) return false
  try {
    return JSON.parse(readFileSync(manifest, 'utf8')).name === '@synthwerk/sdk'
  } catch {
    return false
  }
}

export function findCheckout(sdkDir: string | undefined, cwd: string): string {
  const dir = sdkDir === undefined ? ownCheckout : resolve(cwd, sdkDir)
  if (isSdkCheckout(dir)) return dir
  throw new Error(
    sdkDir === undefined
      ? '--local needs a synthwerk-sdk checkout. Run the CLI from one or pass --sdk-dir <path>.'
      : `${dir} is not a synthwerk-sdk checkout (no packages/sdk).`
  )
}

/** Name, version and folder of each package; fails when one is not built. */
export function readPackages(checkout: string, template: Template): PackageInfo[] {
  return localPackages[template].map((folder) => {
    const dir = join(checkout, 'packages', folder)
    const { name, version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      name: string
      version: string
    }
    if (!existsSync(join(dir, 'dist'))) {
      throw new Error(`${name} is not built. Run \`pnpm build\` in ${checkout} first.`)
    }
    return { name, version, dir }
  })
}

/** The file name `pnpm pack` gives: `@synthwerk/sdk@0.3.0` → `synthwerk-sdk-0.3.0.tgz`. */
export function tarballName(name: string, version: string): string {
  return `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`
}

/** The pnpm-workspace.yaml block that sends every package to its tarball. */
export function overridesBlock(packages: readonly PackageInfo[]): string {
  const lines = packages.map(
    (pkg) => `  '${pkg.name}': file:${LOCAL_DIR}/${tarballName(pkg.name, pkg.version)}`
  )
  return [
    '',
    `${OVERRIDES_MARKER}: @synthwerk/* packed from a synthwerk-sdk checkout.`,
    `# For the npm versions, delete this block and the ${LOCAL_DIR}/ folder, then pnpm install.`,
    'overrides:',
    ...lines,
    ''
  ].join('\n')
}

export type Exec = (command: string, args: readonly string[], cwd: string) => void

export const execSync: Exec = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd} (exit ${result.status})`)
  }
}

/** Packs the template's packages into `<root>/.synthwerk/` and writes the overrides. */
export function linkLocal(
  root: string,
  template: Template,
  checkout: string,
  exec: Exec = execSync
): PackageInfo[] {
  const packages = readPackages(checkout, template)
  const dest = join(root, LOCAL_DIR)
  mkdirSync(dest, { recursive: true })
  for (const pkg of packages) exec('pnpm', ['pack', '--pack-destination', dest], pkg.dir)
  appendFileSync(join(root, 'pnpm-workspace.yaml'), overridesBlock(packages))
  return packages
}
