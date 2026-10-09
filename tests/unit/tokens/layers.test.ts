import { describe, expect, it } from 'vitest'
import { renderTokensCss, selectors } from '../../../packages/tokens/src/css.ts'
import {
  brand,
  components,
  gradients,
  modes,
  primitives,
  semanticColorNames,
  services,
  themeNames,
  themes
} from '../../../packages/tokens/src/tokens.ts'

const HEX = /#[0-9a-f]{3,8}\b/i
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i
const primitiveNames = new Set(Object.keys(primitives))

describe('token layers', () => {
  it('primitives - every value - is #RRGGBB', () => {
    for (const hex of Object.values(primitives)) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('semantic layer - all themes and modes - has no hex and no colour function', () => {
    const text = JSON.stringify(themes)
    expect(text).not.toMatch(HEX)
    expect(text).not.toMatch(COLOUR_FUNCTION)
  })

  it('semantic colours - every theme × mode - reference an existing primitive', () => {
    for (const theme of themeNames) {
      for (const mode of modes) {
        for (const name of semanticColorNames) {
          expect(primitiveNames.has(themes[theme][mode].colors[name])).toBe(true)
        }
      }
    }
  })

  it('effects - every tint - references an existing primitive', () => {
    const tints = [...JSON.stringify(themes).matchAll(/"tint":"([\w-]+)"/g)].map((m) => m[1])
    expect(tints.length).toBeGreaterThan(0)
    for (const t of tints) expect(primitiveNames.has(t as string)).toBe(true)
  })

  it('component, service, brand and gradient layers - values - contain no hex', () => {
    expect(JSON.stringify(components)).not.toMatch(HEX)
    // color-mix() is allowed in component tokens: it mixes semantic variables, not literals.
    expect(JSON.stringify(components).replaceAll('color-mix(', '')).not.toMatch(COLOUR_FUNCTION)
    for (const layer of [services, brand, gradients]) {
      const refs = JSON.stringify(layer).match(/"[\w-]+"/g) ?? []
      expect(JSON.stringify(layer)).not.toMatch(HEX)
      expect(refs.length).toBeGreaterThan(0)
    }
    for (const s of Object.values(services)) {
      expect(primitiveNames.has(s.neon) && primitiveNames.has(s.deep)).toBe(true)
    }
  })

  it('generated tokens.css - outside the primitive block - has no hex literal', () => {
    const css = renderTokensCss().replace(/\/\*[\s\S]*?\*\//g, '')
    const firstThemeRule = css.indexOf(`${selectors.default.light} {`)
    expect(firstThemeRule).toBeGreaterThan(0)
    expect(css.slice(firstThemeRule)).not.toMatch(HEX)
  })
})
