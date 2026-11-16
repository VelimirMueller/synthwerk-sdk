import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  findCheckout,
  isSdkCheckout,
  linkLocal,
  overridesBlock,
  ownCheckout,
  tarballName
} from '../../../packages/create-synthwerk-app/src/local.ts'

const dirs: string[] = []
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'csa-local-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A fake checkout: packages/<folder> with a manifest and, if built, a dist folder. */
function checkout(built: boolean): string {
  const root = temp()
  const names: Record<string, string> = {
    sdk: '@synthwerk/sdk',
    react: '@synthwerk/react',
    tokens: '@synthwerk/tokens'
  }
  for (const [folder, name] of Object.entries(names)) {
    mkdirSync(join(root, 'packages', folder, built ? 'dist' : ''), { recursive: true })
    writeFileSync(
      join(root, 'packages', folder, 'package.json'),
      JSON.stringify({ name, version: '1.2.3' })
    )
  }
  return root
}

describe('create-synthwerk-app --local', () => {
  it('this repo - is a synthwerk-sdk checkout', () => {
    expect(isSdkCheckout(ownCheckout)).toBe(true)
    expect(findCheckout(undefined, '/')).toBe(ownCheckout)
  })

  it('not a checkout - clear error', () => {
    expect(isSdkCheckout(temp())).toBe(false)
    expect(() => findCheckout(temp(), '/')).toThrow(/not a synthwerk-sdk checkout/)
  })

  it('packs each package into .synthwerk and points overrides at the tarballs', () => {
    const repo = checkout(true)
    const app = temp()
    writeFileSync(join(app, 'pnpm-workspace.yaml'), 'packages:\n  - .\n')
    const calls: [string, readonly string[], string][] = []
    const packages = linkLocal(app, 'react', repo, (cmd, args, cwd) => {
      calls.push([cmd, args, cwd])
    })
    expect(packages.map((p) => p.name)).toEqual([
      '@synthwerk/sdk',
      '@synthwerk/react',
      '@synthwerk/tokens'
    ])
    expect(calls).toHaveLength(3)
    expect(calls[0]).toEqual([
      'pnpm',
      ['pack', '--pack-destination', join(app, '.synthwerk')],
      join(repo, 'packages', 'sdk')
    ])
    const yaml = readFileSync(join(app, 'pnpm-workspace.yaml'), 'utf8')
    expect(yaml).toContain("'@synthwerk/react': file:.synthwerk/synthwerk-react-1.2.3.tgz")
  })

  it('unbuilt package - refused before any pack', () => {
    expect(() => linkLocal(temp(), 'react', checkout(false), () => {})).toThrow(/not built/)
  })

  it('tarball names and the overrides block follow pnpm pack', () => {
    expect(tarballName('@synthwerk/sdk', '0.3.0')).toBe('synthwerk-sdk-0.3.0.tgz')
    expect(overridesBlock([{ name: '@synthwerk/vue', version: '0.1.0', dir: '/x' }])).toContain(
      'overrides:\n'
    )
  })
})
