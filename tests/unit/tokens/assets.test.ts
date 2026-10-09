import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primitives } from '../../../packages/tokens/src/tokens.ts'

const dir = new URL('../../../packages/tokens/assets/', import.meta.url)
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'))
const read = (f: string) => readFileSync(new URL(f, dir), 'utf8')

describe('logo assets', () => {
  it('assets folder - logo, wordmark and mark - light and dark exist, plus favicon', () => {
    for (const kind of ['logo', 'wordmark', 'mark']) {
      for (const mode of ['light', 'dark']) expect(files).toContain(`synthwerk-${kind}-${mode}.svg`)
    }
    expect(files).toContain('synthwerk-favicon.svg')
  })

  it.each(files)('%s - text - outlined (no <text>, no font reference, finite paths)', (file) => {
    const svg = read(file)
    expect(svg).not.toMatch(/<text\b/)
    expect(svg).not.toMatch(/font-family|@font-face/)
    expect(svg).not.toContain('NaN')
    expect(svg).toMatch(/<title>synthwerk<\/title>/)
    expect(svg).toContain('Space Mono Bold')
  })

  it.each(files)('%s - public look (D-41) - no Patch squiggle, no gradient, no neon', (file) => {
    const svg = read(file)
    expect(svg).not.toMatch(/<linearGradient|stop-color|stroke-linecap/)
    for (const neon of ['#00FFF7', '#EE4FFF', '#009C97', '#EA29FF']) expect(svg).not.toContain(neon)
  })

  it.each(['light', 'dark'] as const)(
    'logo %s - colours - ink and tile follow the mode',
    (mode) => {
      const svg = read(`synthwerk-logo-${mode}.svg`)
      const [ink, onTile] =
        mode === 'light'
          ? [primitives['zinc-850'], primitives['zinc-50']]
          : [primitives['zinc-50'], primitives['graphite-950']]
      expect(svg).toContain(`fill="${ink}"`)
      expect(svg).toContain(`fill="${onTile}"`)
    }
  )

  it('favicon - dark scheme - swaps tile and letters', () => {
    const svg = read('synthwerk-favicon.svg')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
    expect(svg).toContain(primitives['graphite-950'])
  })
})
