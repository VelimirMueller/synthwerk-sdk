// The two templates share their auth, settings and test support files byte for byte.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shared = [
  'src/auth.ts',
  'src/config.ts',
  'tests/auth.test.ts',
  'tests/config.test.ts',
  'tests/support/fake-auth.ts',
  'tests/support/mock-edge.ts',
  '_env.example',
  '_gitignore',
  'pnpm-workspace.yaml',
  'README.md'
]
const root = new URL('../../../packages/create-synthwerk-app/templates/', import.meta.url)
const read = (template: string, file: string) =>
  readFileSync(new URL(`${template}/${file}`, root), 'utf8')

describe('create-synthwerk-app templates', () => {
  it.each(shared)('%s - same in react and vue', (file) => {
    expect(read('vue', file)).toBe(read('react', file))
  })

  it('package.json - same @synthwerk/* ranges as the workspace versions', () => {
    const versions = Object.fromEntries(
      ['sdk', 'react', 'vue', 'tokens', 'ui-vue'].map((folder) => {
        const manifest = JSON.parse(
          readFileSync(new URL(`../../../packages/${folder}/package.json`, import.meta.url), 'utf8')
        )
        return [manifest.name, manifest.version]
      })
    )
    for (const template of ['react', 'vue']) {
      const deps = JSON.parse(read(template, 'package.json')).dependencies as Record<string, string>
      for (const [name, range] of Object.entries(deps)) {
        if (name.startsWith('@synthwerk/'))
          expect(range, `${template} ${name}`).toBe(`^${versions[name]}`)
      }
    }
  })
})
