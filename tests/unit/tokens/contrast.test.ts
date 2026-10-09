import { describe, expect, it } from 'vitest'
import { contrastRatio, grade, luminance, round2 } from '../../../packages/tokens/src/contrast.ts'
import { resolveColors } from '../../../packages/tokens/src/css.ts'
import {
  type Mode,
  modes,
  primitives,
  type SemanticColor,
  serviceNames,
  services,
  type ThemeName,
  themeNames
} from '../../../packages/tokens/src/tokens.ts'
import { brandNotes, ringOnBg, serviceTable, textTable } from './fixtures/brand-doc-contrast.ts'

const combos = themeNames.flatMap((theme) => modes.map((mode) => [theme, mode] as const))
const key = (theme: ThemeName, mode: Mode) => `${theme}·${mode}` as const

/** Every token that carries text. Status colours are used as text (labels, messages). */
const TEXT: readonly SemanticColor[] = [
  'fg',
  'fg-muted',
  'fg-subtle',
  'accent-text',
  'accent-2-text',
  'success',
  'warning',
  'danger',
  'info'
]
const SURFACES: readonly SemanticColor[] = ['bg', 'surface', 'surface-2']
const AA_TEXT = 4.5
const AA_UI = 3

describe('contrastRatio', () => {
  it('contrastRatio - black on white - 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10)
  })

  it('contrastRatio - same colour - 1', () => {
    expect(contrastRatio('#EE4FFF', '#EE4FFF')).toBe(1)
  })

  it('contrastRatio - argument order swapped - same ratio', () => {
    expect(contrastRatio('#007874', '#F7F7FB')).toBe(contrastRatio('#F7F7FB', '#007874'))
  })

  it('luminance - short or invalid hex - throws', () => {
    expect(() => luminance('#FFF')).toThrow(TypeError)
    expect(() => luminance('red')).toThrow(TypeError)
  })
})

describe.each(combos)('WCAG AA · %s · %s', (theme, mode) => {
  const c = resolveColors(theme, mode)

  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    'text %s on %s - ratio - at least 4.5',
    (text, surface) => {
      expect(contrastRatio(c[text], c[surface])).toBeGreaterThanOrEqual(AA_TEXT)
    }
  )

  it('accent-fg on accent - ratio - at least 4.5', () => {
    expect(contrastRatio(c['accent-fg'], c.accent)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('accent-2-fg on accent-2 - ratio - at least 4.5', () => {
    expect(contrastRatio(c['accent-2-fg'], c['accent-2'])).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(SURFACES)('ring (UI) on %s - ratio - at least 3', (surface) => {
    expect(contrastRatio(c.ring, c[surface])).toBeGreaterThanOrEqual(AA_UI)
  })

  it.each(serviceNames.flatMap((s) => SURFACES.map((surface) => [s, surface] as const)))(
    'service %s text on %s - ratio - at least 4.5',
    (service, surface) => {
      const accent = primitives[mode === 'dark' ? services[service].neon : services[service].deep]
      expect(contrastRatio(accent, c[surface])).toBeGreaterThanOrEqual(AA_TEXT)
    }
  )
})

describe('brand doc §6 tables', () => {
  describe.each(combos)('%s · %s', (theme, mode) => {
    const c = resolveColors(theme, mode)

    it.each(textTable[key(theme, mode)])(
      '%s - computed ratios - equal the doc (%s / %s, %s)',
      (token, onBg, onSurface2, docGrade) => {
        if (token === 'accent-fg/accent') {
          expect(round2(contrastRatio(c['accent-fg'], c.accent))).toBe(onBg)
          expect(grade(contrastRatio(c['accent-fg'], c.accent))).toBe(docGrade)
          return
        }
        const fg = c[token as SemanticColor]
        const bg = round2(contrastRatio(fg, c.bg))
        const s2 = round2(contrastRatio(fg, c['surface-2']))
        expect([bg, s2]).toEqual([onBg, onSurface2])
        // The doc grades on the lower of the two values.
        expect(grade(Math.min(bg, s2))).toBe(docGrade)
      }
    )

    it('ring on bg - computed ratio - equals the doc', () => {
      expect(round2(contrastRatio(c.ring, c.bg))).toBe(ringOnBg[key(theme, mode)])
    })
  })

  it.each(serviceNames)('service %s - computed ratios - equal the doc', (service) => {
    const dark = ['void-950', 'void-850', 'zinc-950', 'zinc-850'] as const
    const light = ['zinc-50', 'zinc-100', 'mist-50', 'mist-100'] as const
    const neon = primitives[services[service].neon]
    const deep = primitives[services[service].deep]
    expect(dark.map((s) => round2(contrastRatio(neon, primitives[s])))).toEqual(
      serviceTable[service].neon
    )
    expect(light.map((s) => round2(contrastRatio(deep, primitives[s])))).toEqual(
      serviceTable[service].deep
    )
  })

  it('brand palette notes §3.2 and §6 - computed ratios - equal the doc', () => {
    const paper = primitives['zinc-50']
    const r = (a: string, b: string) => round2(contrastRatio(a, b))
    expect(Math.round(contrastRatio(primitives['zinc-550'], paper) * 10) / 10).toBe(
      brandNotes.steelOnPaper
    )
    expect(r(primitives['print-cyan'], paper)).toBe(brandNotes.printCyanOnPaper)
    expect(r(primitives['print-magenta'], paper)).toBe(brandNotes.printMagentaOnPaper)
    expect(r(primitives['neon-cyan'], paper)).toBe(brandNotes.neonCyanOnPaper)
    expect(r(primitives['neon-magenta'], paper)).toBe(brandNotes.neonMagentaOnPaper)
    expect(r(primitives['void-950'], primitives['neon-magenta'])).toBe(
      brandNotes.accent2FgOnMagenta
    )
    expect(r(primitives.white, primitives['neon-magenta'])).toBe(brandNotes.whiteOnMagenta)
  })

  it('print signal stops on paper - ratio - at least 3 (graphic, WCAG 1.4.11)', () => {
    for (const stop of ['print-cyan', 'print-magenta'] as const) {
      expect(contrastRatio(primitives[stop], primitives['zinc-50'])).toBeGreaterThanOrEqual(AA_UI)
    }
  })
})
