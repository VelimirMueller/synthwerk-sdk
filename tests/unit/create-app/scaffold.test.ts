import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  envLocal,
  isEmptyDir,
  scaffold,
  targetName,
  toPackageName
} from '../../../packages/create-synthwerk-app/src/scaffold.ts'

const dirs: string[] = []
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'csa-test-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('scaffold', () => {
  it('react template - copies the files, renames _gitignore, sets the package name', () => {
    const cwd = temp()
    const app = scaffold({ dir: 'My App!', template: 'react', cwd })
    expect(app.name).toBe('my-app')
    expect(app.files).toContain('.gitignore')
    expect(app.files).toContain('.env.example')
    expect(app.files).toContain('src/App.tsx')
    expect(app.files).toContain('tests/App.test.tsx')
    expect(app.files).not.toContain('.env.local')
    const manifest = JSON.parse(readFileSync(join(app.root, 'package.json'), 'utf8'))
    expect(manifest.name).toBe('my-app')
    expect(manifest.dependencies['@synthwerk/react']).toBeDefined()
  })

  it('vue template - the Vue adapter and ui-vue', () => {
    const app = scaffold({ dir: 'v', template: 'vue', cwd: temp() })
    expect(app.files).toContain('src/App.vue')
    const manifest = JSON.parse(readFileSync(join(app.root, 'package.json'), 'utf8'))
    expect(Object.keys(manifest.dependencies)).toEqual(
      expect.arrayContaining(['@synthwerk/vue', '@synthwerk/ui-vue'])
    )
  })

  it('env values - written to .env.local', () => {
    const app = scaffold({
      dir: 'a',
      template: 'react',
      cwd: temp(),
      env: { apiUrl: 'https://api.test', clientId: 'c1' }
    })
    expect(readFileSync(join(app.root, '.env.local'), 'utf8')).toBe(
      'VITE_SYNTHWERK_API_URL="https://api.test"\nVITE_SYNTHWERK_CLIENT_ID="c1"\n'
    )
  })

  it('a non-empty target - refused, nothing written', () => {
    const cwd = temp()
    mkdirSync(join(cwd, 'taken'))
    writeFileSync(join(cwd, 'taken', 'x.txt'), 'x')
    expect(() => scaffold({ dir: 'taken', template: 'react', cwd })).toThrow(/not empty/)
  })

  it('a missing template folder - error', () => {
    expect(() => scaffold({ dir: 'a', template: 'react', cwd: temp(), from: temp() })).toThrow(
      /missing/
    )
  })

  it('helpers - names, empty dirs, env lines', () => {
    expect(toPackageName('/x/__Hello World--')).toBe('hello-world')
    expect(toPackageName('/x/!!!')).toBe('synthwerk-app')
    expect(targetName('_gitignore')).toBe('.gitignore')
    expect(targetName('index.html')).toBe('index.html')
    const dir = temp()
    expect(isEmptyDir(join(dir, 'none'))).toBe(true)
    mkdirSync(join(dir, '.git'))
    expect(isEmptyDir(dir)).toBe(true)
    expect(envLocal()).toBeNull()
    expect(() => envLocal({ apiUrl: 'https://a\nB=1' })).toThrow(/one line/)
    expect(() => envLocal({ apiUrl: 'https://a/$HOME' })).toThrow(/one line/)
  })
})
