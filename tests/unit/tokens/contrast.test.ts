import { describe, expect, it } from 'vitest'
import { contrastRatio, grade, luminance, round2 } from '../../../packages/tokens/src/contrast.ts'
import { resolveColors } from '../../../packages/tokens/src/css.ts'
import {
  gradients,
  groupNames,
  type Mode,
  modes,
  type Primitive,
  primitives,
  type SemanticColor,
  serviceNames,
  services,
  type ThemeName,
  themeNames,
  themes
} from '../../../packages/tokens/src/tokens.ts'
import {
  borderControlTable,
  brandNotes,
  ringOnBg,
  serviceTable,
  textTable
} from './fixtures/brand-doc-contrast.ts'

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
const AAA_TEXT = 7
const AA_UI = 3

/** `color` at `alpha` percent painted over an opaque `backdrop` (sRGB source-over), as #RRGGBB. */
function composite(color: string, alpha: number, backdrop: string): string {
  const ch = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const a = alpha / 100
  const out = [0, 1, 2].map((i) => Math.round(ch(color, i) * a + ch(backdrop, i) * (1 - a)))
  return `#${out.map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

describe('contrastRatio', () => {
  it('contrastRatio - black on white - 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10)
  })

  it('contrastRatio - same colour - 1', () => {
    expect(contrastRatio('#EE4FFF', '#EE4FFF')).toBe(1)
  })

  it('contrastRatio - argument order swapped - same ratio', () => {
    expect(contrastRatio('#4F46E5', '#FAFAFA')).toBe(contrastRatio('#FAFAFA', '#4F46E5'))
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

  it.each(SURFACES)('border-control (UI, WCAG 1.4.11) on %s - ratio - at least 3', (surface) => {
    expect(contrastRatio(c['border-control'], c[surface])).toBeGreaterThanOrEqual(AA_UI)
  })

  it.each(serviceNames.flatMap((s) => SURFACES.map((surface) => [s, surface] as const)))(
    'service %s badge text on badge fill over %s - ratio - at least 4.5',
    (service, surface) => {
      const s = services[service]
      const text = primitives[mode === 'dark' ? s.dark : s.light]
      const tint = themes[theme][mode].effects['badge-service-tint']
      const fill = composite(primitives[s.dark], tint, c[surface])
      expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(AA_TEXT)
    }
  )

  it.each(serviceNames.flatMap((s) => SURFACES.map((surface) => [s, surface] as const)))(
    'service %s text on %s - ratio - at least 4.5',
    (service, surface) => {
      const accent = primitives[mode === 'dark' ? services[service].dark : services[service].light]
      expect(contrastRatio(accent, c[surface])).toBeGreaterThanOrEqual(AA_TEXT)
    }
  )
})

const groupCombos = groupNames.flatMap((group) => combos.map(([t, m]) => [group, t, m] as const))
const GROUP_TEXT: readonly SemanticColor[] = ['accent-2-text']

describe.each(groupCombos)('group %s · %s · %s', (group, theme, mode) => {
  const c = resolveColors(theme, mode, group)
  const min = theme === 'contrast' ? AAA_TEXT : AA_TEXT

  it.each(GROUP_TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    'text %s on %s - ratio - meets the theme promise (AA, contrast AAA)',
    (text, surface) => {
      expect(contrastRatio(c[text], c[surface])).toBeGreaterThanOrEqual(min)
    }
  )

  it('accent-2-fg on accent-2 - ratio - at least 4.5', () => {
    expect(contrastRatio(c['accent-2-fg'], c['accent-2'])).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(SURFACES)('ring (UI) on %s - ratio - at least 3', (surface) => {
    expect(contrastRatio(c.ring, c[surface])).toBeGreaterThanOrEqual(AA_UI)
  })
})

describe('brand doc §6 tables', () => {
  describe.each(combos)('%s · %s', (theme, mode) => {
    const c = resolveColors(theme, mode)

    it.each(textTable[key(theme, mode)])(
      '%s - computed ratios - equal the doc (%s / %s, %s)',
      (token, onBg, onSurface2, docGrade) => {
        if (token.includes('/')) {
          const [fg, bg] = token.split('/') as [SemanticColor, SemanticColor]
          expect(round2(contrastRatio(c[fg], c[bg]))).toBe(onBg)
          expect(grade(contrastRatio(c[fg], c[bg]))).toBe(docGrade)
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

    it('border-control on bg / surface / surface-2 - computed ratios - equal the doc', () => {
      const r = SURFACES.map((surface) => round2(contrastRatio(c['border-control'], c[surface])))
      expect(r).toEqual(borderControlTable[key(theme, mode)])
    })

    it('ring on bg - computed ratio - equals the doc', () => {
      expect(round2(contrastRatio(c.ring, c.bg))).toBe(ringOnBg[key(theme, mode)])
    })
  })

  it.each(serviceNames)('service %s - computed ratios - equal the doc', (service) => {
    const dark = ['graphite-950', 'graphite-850', 'black', 'zinc-850'] as const
    const light = ['zinc-50', 'zinc-100', 'white'] as const
    const d = primitives[services[service].dark]
    const l = primitives[services[service].light]
    expect(dark.map((s) => round2(contrastRatio(d, primitives[s])))).toEqual(
      serviceTable[service].dark
    )
    expect(light.map((s) => round2(contrastRatio(l, primitives[s])))).toEqual(
      serviceTable[service].light
    )
  })

  it('public presence notes (07c) - computed ratios - equal the doc', () => {
    const r = (a: Primitive, b: Primitive) => round2(contrastRatio(primitives[a], primitives[b]))
    expect(r('emerald-500', 'graphite-950')).toBe(brandNotes.emeraldOnNight)
    expect(r('emerald-700', 'zinc-50')).toBe(brandNotes.emeraldPrintOnPaper)
    expect(r('indigo-500', 'graphite-950')).toBe(brandNotes.indigoOnNight)
    expect(r('indigo-600', 'zinc-50')).toBe(brandNotes.indigoPrintOnPaper)
    expect(gradients['edge-light'].map((g) => r(g, 'zinc-50'))).toEqual([
      ...brandNotes.edgeLightStopsOnPaper
    ])
    expect(gradients['edge-dark'].map((g) => r(g, 'graphite-950'))).toEqual([
      ...brandNotes.edgeDarkStopsOnNight
    ])
  })

  it('edge gradient stops on their page - ratio - at least 3 (graphic, WCAG 1.4.11)', () => {
    for (const stop of gradients['edge-light']) {
      expect(contrastRatio(primitives[stop], primitives['zinc-50'])).toBeGreaterThanOrEqual(AA_UI)
    }
    for (const stop of gradients['edge-dark']) {
      expect(contrastRatio(primitives[stop], primitives['graphite-950'])).toBeGreaterThanOrEqual(
        AA_UI
      )
    }
  })
})

describe.each(modes)('contrast theme · %s - low-vision promise', (mode) => {
  const c = resolveColors('contrast', mode)

  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    'text %s on %s - ratio - at least 7 (AAA)',
    (text, surface) => {
      expect(contrastRatio(c[text], c[surface])).toBeGreaterThanOrEqual(AAA_TEXT)
    }
  )

  it.each(SURFACES)('border-control on %s - ratio - at least 4.5', (surface) => {
    expect(contrastRatio(c['border-control'], c[surface])).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('effects - glow, edge glow, shadow, grid and badge tint - all off', () => {
    const e = themes.contrast[mode].effects
    expect([
      e.glow,
      e['glow-edge'],
      e['shadow-card-v'],
      e['texture-grid'],
      e['badge-service-tint']
    ]).toEqual(['none', 'none', 'none', 'none', 0])
  })
})
