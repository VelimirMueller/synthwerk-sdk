import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primitives } from '../../../packages/tokens/src/tokens.ts'

const dir = new URL('../../../packages/tokens/assets/', import.meta.url)
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'))
const read = (f: string) => readFileSync(new URL(f, dir), 'utf8')

describe('logo assets', () => {
  it('assets folder - logo, wordmark and mark - light and dark exist', () => {
    for (const kind of ['logo', 'wordmark', 'mark']) {
      for (const mode of ['light', 'dark']) expect(files).toContain(`synthwerk-${kind}-${mode}.svg`)
    }
  })

  it.each(files)('%s - text - outlined (no <text>, no font reference, finite paths)', (file) => {
    const svg = read(file)
    expect(svg).not.toMatch(/<text\b/)
    expect(svg).not.toMatch(/font-family|@font-face/)
    expect(svg).not.toContain('NaN')
    expect(svg).toMatch(/<title>synthwerk<\/title>/)
  })

  it.each(['light', 'dark'] as const)('logo %s - colours - follow the brand rules', (mode) => {
    const svg = read(`synthwerk-logo-${mode}.svg`)
    const [ink, from, to] =
      mode === 'light'
        ? [primitives['zinc-950'], primitives['print-cyan'], primitives['print-magenta']]
        : [primitives['zinc-100'], primitives['neon-cyan'], primitives['neon-magenta']]
    expect(svg).toContain(`fill="${ink}"`)
    expect(svg).toContain(`stop-color="${from}"`)
    expect(svg).toContain(`stop-color="${to}"`)
  })
})
