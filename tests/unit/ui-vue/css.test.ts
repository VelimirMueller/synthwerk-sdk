import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../../../packages/tokens/src/contrast.ts'
import { resolveColors } from '../../../packages/tokens/src/css.ts'
import {
  components,
  groupNames,
  type Mode,
  modes,
  type SemanticColor,
  semanticColorNames,
  type ThemeName,
  themeNames
} from '../../../packages/tokens/src/tokens.ts'

const css = readFileSync(new URL('../../../packages/ui-vue/src/ui.css', import.meta.url), 'utf8')

interface Rule {
  readonly selectors: readonly string[]
  readonly decls: ReadonlyMap<string, string>
}

/** Flat CSS only (the stylesheet has no at-rules): selector list and its declarations. */
const rules: readonly Rule[] = [
  ...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)
].map(([, sel = '', body = '']) => ({
  selectors: sel.split(',').map((s) => s.trim()),
  decls: new Map(
    body
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(':')
        return [d.slice(0, i).trim(), d.slice(i + 1).trim()] as const
      })
  )
}))

const FOUNDATION = ':root'

/** The cascade for one element: the declarations of each selector, later wins. */
function cascade(selectors: readonly string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const s of selectors) {
    for (const r of rules) if (r.selectors.includes(s)) for (const [k, v] of r.decls) out.set(k, v)
  }
  return out
}

/** `color` at `alpha` percent over an opaque `backdrop` (sRGB source-over), as #RRGGBB. */
function composite(color: string, alpha: number, backdrop: string): string {
  const ch = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const a = alpha / 100
  const px = [0, 1, 2].map((i) => Math.round(ch(color, i) * a + ch(backdrop, i) * (1 - a)))
  return `#${px.map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

type Palette = Record<SemanticColor, string>
const isSemantic = (name: string): name is SemanticColor =>
  (semanticColorNames as readonly string[]).includes(name)

/** Resolves a CSS colour value of the stylesheet to #RRGGBB, painted over `backdrop`. */
function resolve(value: string, local: Map<string, string>, c: Palette, backdrop: string): string {
  const v = value.trim()
  if (v === 'none' || v === 'transparent') return backdrop
  const mix = v.match(/^color-mix\(in srgb, (.+) (\d+(?:\.\d+)?)%, transparent\)$/)
  if (mix) return composite(resolve(mix[1] ?? '', local, c, backdrop), Number(mix[2]), backdrop)
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (!ref) throw new Error(`Cannot resolve colour "${v}"`)
  const name = ref[1] ?? ''
  if (isSemantic(name)) return c[name]
  const own = local.get(`--${name}`)
  if (own) return resolve(own, local, c, backdrop)
  if (name in components)
    return resolve(components[name as keyof typeof components], local, c, backdrop)
  throw new Error(`Unknown token --${name}`)
}

/** Text that must pass 4.5:1. Each case is the selector cascade of one element and its page. */
interface TextCase {
  readonly name: string
  readonly element: readonly string[]
  /** Selectors of the element that paints the background, if not the element itself. */
  readonly box?: readonly string[]
  readonly on: readonly SemanticColor[]
}

const PAGES: readonly SemanticColor[] = ['bg', 'surface']
const terminal = ['.sw-terminal']

const TEXT: readonly TextCase[] = [
  ...['primary', 'secondary', 'ghost'].map((k) => ({
    name: `button ${k}`,
    element: ['.sw-button', `.sw-button--${k}`],
    on: PAGES
  })),
  {
    name: 'button secondary hover',
    element: ['.sw-button', '.sw-button--secondary', '.sw-button--secondary:hover:enabled'],
    on: PAGES
  },
  ...['neutral', 'accent', 'solid'].map((k) => ({
    name: `pill ${k}`,
    element: ['.sw-pill', `.sw-pill--${k}`],
    on: PAGES
  })),
  ...['live', 'building', 'planned', 'blocked'].map((s) => ({
    name: `status pill ${s}`,
    element: ['.sw-status-pill', `.sw-status-pill--${s}`],
    on: PAGES
  })),
  { name: 'input value', element: ['.sw-input'], on: PAGES },
  {
    name: 'input placeholder',
    element: ['.sw-input::placeholder'],
    box: ['.sw-input'],
    on: PAGES
  },
  ...['eyebrow', 'title', 'body'].map((p) => ({
    name: `card ${p}`,
    element: [`.sw-card__${p}`],
    box: ['.sw-card'],
    on: PAGES
  })),
  { name: 'divider label', element: ['.sw-divider', '.sw-divider--label'], on: PAGES },
  ...['prompt', 'command', 'copy', 'title'].map((p) => ({
    name: `terminal ${p}`,
    element: [`.sw-terminal__${p}`],
    box: terminal,
    on: PAGES
  })),
  ...['', '--muted', '--success', '--danger'].map((t) => ({
    name: `terminal line${t}`,
    element: ['.sw-terminal__line', ...(t ? [`.sw-terminal__line${t}`] : [])],
    box: terminal,
    on: PAGES
  }))
]

const combos = themeNames.flatMap((theme) =>
  modes.flatMap((mode) => groupNames.map((group) => [theme, mode, group] as const))
)
const AA_TEXT = 4.5

describe('ui.css - tokens only', () => {
  const components = rules.filter((r) => !r.selectors.includes(FOUNDATION))
  const values = components.flatMap((r) => [...r.decls].map(([k, v]) => [r.selectors[0], k, v]))

  it('has a foundation block and component rules', () => {
    expect(rules.some((r) => r.selectors.includes(FOUNDATION))).toBe(true)
    expect(values.length).toBeGreaterThan(100)
  })

  it.each(values)('%s { %s } - value - has no colour literal', (_s, _k, v) => {
    expect(v).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i)
    expect(v).not.toMatch(/\b(?:white|black|red|green|blue|gray|grey)\b/i)
  })

  it.each(values)('%s { %s } - value - has no size literal', (_s, _k, v) => {
    expect(v).not.toMatch(/\d(?:px|rem|em|vh|vw|ch|pt)\b/)
  })
})

describe('ui.css - every component has a focus and a disabled state', () => {
  const roots = [
    '.sw-button',
    '.sw-pill',
    '.sw-status-pill',
    '.sw-input',
    '.sw-card',
    '.sw-divider',
    '.sw-terminal',
    '.sw-terminal__copy'
  ]

  it.each(roots)('%s:focus-visible - outline - is the focus token', (root) => {
    const focus = cascade([`${root}:focus-visible`])
    expect(focus.get('outline')).toBe('var(--focus-outline)')
    expect(focus.get('outline-offset')).toBe('var(--focus-outline-offset)')
  })

  it('disabled - opacity - is the disabled foundation', () => {
    for (const s of ['.sw-is-disabled', '.sw-button:disabled', '.sw-input:disabled']) {
      expect(cascade([s]).get('opacity')).toBe('var(--sw-disabled-opacity)')
    }
  })
})

describe.each(combos)(
  'ui.css - text contrast · %s · %s · %s',
  (theme: ThemeName, mode: Mode, group) => {
    const c = resolveColors(theme, mode, group)
    const cases = TEXT.flatMap((t) => t.on.map((page) => [t.name, page, t] as const))

    it.each(cases)('%s on %s - ratio - at least 4.5', (_name, page, t) => {
      const fg = cascade(t.element)
      const box = t.box ? cascade(t.box) : fg
      const local = new Map([...box, ...fg])
      const bg = resolve(box.get('background') ?? 'none', local, c, c[page])
      const text = resolve(fg.get('color') ?? box.get('color') ?? 'var(--fg)', local, c, bg)
      expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(AA_TEXT)
    })
  }
)
