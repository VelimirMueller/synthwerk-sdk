/**
 * Synthwerk design tokens: the single source of truth.
 *
 * Layers (brand doc 07 §4):
 * 1. Primitives: raw hex values. The only place where a hex value may appear.
 * 2. Semantic: one role per theme × mode. Values are primitive names, never hex.
 * 3. Component: one widget's decision. Values point to semantic tokens.
 * 4. Service: `--service-accent` and `--service-accent-text` only.
 */

// ---------------------------------------------------------------- 1. Primitives

export const primitives = {
  white: '#FFFFFF',
  black: '#000000',

  'zinc-50': '#FAFAFA',
  'zinc-100': '#F4F4F5',
  'zinc-200': '#E4E4E7',
  'zinc-300': '#D4D4D8',
  'zinc-400': '#A1A1AA',
  'zinc-450': '#8A8A93',
  'zinc-550': '#6B6B74',
  'zinc-600': '#52525B',
  'zinc-700': '#3F3F46',
  'zinc-800': '#27272A',
  'zinc-850': '#18181B',
  'zinc-900': '#121214',
  'zinc-950': '#09090B',

  'void-950': '#070514',
  'void-900': '#0E0B1F',
  'void-850': '#120E28',
  'void-800': '#1E1840',
  'void-700': '#322868',

  'glacier-100': '#E6F1FF',
  'glacier-300': '#A9B4D6',
  'glacier-400': '#8790BC',

  'mist-50': '#F7F7FB',
  'mist-100': '#EEF0F6',
  'mist-200': '#DADDEB',

  'slate-950': '#0B0A1A',
  'slate-700': '#454A5E',
  'slate-600': '#5F6580',

  'neon-cyan': '#00FFF7',
  'neon-magenta': '#EE4FFF',
  'neon-green': '#05FFA1',
  'neon-acid': '#F0FF19',
  'neon-red': '#FF2A6D',
  'neon-uv': '#8F7DFF',
  'neon-uv-deep': '#4A2EFF',
  'neon-blue': '#00A3FF',

  'deep-cyan': '#007874',
  'deep-magenta': '#BB00CE',
  'deep-green': '#007A4C',
  'deep-acid': '#687000',
  'deep-red': '#D70044',
  'deep-blue': '#0070B0',

  'print-cyan': '#009C97',
  'print-magenta': '#EA29FF',

  // Status colours of the `default` theme (Tailwind palette values).
  'green-700': '#15803D',
  'amber-700': '#B45309',
  'red-700': '#B91C1C',
  'blue-700': '#1D4ED8',
  'green-400': '#4ADE80',
  'amber-400': '#FBBF24',
  'red-400': '#F87171',
  'blue-400': '#60A5FA'
} as const satisfies Record<string, `#${string}`>

export type Primitive = keyof typeof primitives
export type Hex = (typeof primitives)[Primitive]

/** Gradients built only from primitives. */
export const gradients = {
  'signal-neon': ['neon-cyan', 'neon-magenta'],
  'signal-print': ['print-cyan', 'print-magenta']
} as const satisfies Record<string, readonly [Primitive, Primitive]>

export type Gradient = keyof typeof gradients

/** Brand palette (§3.2): names for brand assets, mapped to primitives. */
export const brand = {
  ink: 'zinc-950',
  graphite: 'zinc-800',
  steel: 'zinc-550',
  mist: 'zinc-200',
  paper: 'zinc-50',
  void: 'void-950',
  'signal-cyan': 'neon-cyan',
  'signal-magenta': 'neon-magenta',
  'signal-cyan-print': 'print-cyan',
  'signal-magenta-print': 'print-magenta'
} as const satisfies Record<string, Primitive>

// ---------------------------------------------------------------- 2. Semantic

export const themeNames = ['default', 'cyberpunk'] as const
export const modes = ['light', 'dark'] as const
export type ThemeName = (typeof themeNames)[number]
export type Mode = (typeof modes)[number]

export const semanticColorNames = [
  'bg',
  'surface',
  'surface-2',
  'border',
  'border-subtle',
  'border-control',
  'fg',
  'fg-muted',
  'fg-subtle',
  'accent',
  'accent-fg',
  'accent-text',
  'accent-2',
  'accent-2-fg',
  'accent-2-text',
  'success',
  'warning',
  'danger',
  'info',
  'ring'
] as const
export type SemanticColor = (typeof semanticColorNames)[number]

/**
 * A colour with alpha, built from a primitive. Rendered as
 * `color-mix(in srgb, var(--<primitive>) <alpha>%, transparent)`.
 */
export interface Tint {
  readonly tint: Primitive
  readonly alpha: number
}

export interface ShadowLayer {
  readonly x: number
  readonly y: number
  readonly blur: number
  readonly spread?: number
  readonly inset?: boolean
  readonly color: Tint
}

/** A shadow is `none` or a list of layers. */
export type Shadow = 'none' | readonly ShadowLayer[]

export interface TextureGrid {
  readonly line: Tint
  readonly size: number
}

export interface SemanticEffects {
  readonly glow: Shadow
  readonly 'shadow-card-v': Shadow
  readonly 'gradient-signal': Gradient
  readonly 'texture-grid': TextureGrid | 'none'
  /** Share of `--service-accent` in the service badge fill, in percent. */
  readonly 'badge-service-tint': number
}

export const semanticEffectNames = [
  'glow',
  'shadow-card-v',
  'gradient-signal',
  'texture-grid',
  'badge-service-tint'
] as const satisfies readonly (keyof SemanticEffects)[]

export interface ThemeMode {
  readonly colors: Readonly<Record<SemanticColor, Primitive>>
  readonly effects: SemanticEffects
}

const tint = (primitive: Primitive, alpha: number): Tint => ({ tint: primitive, alpha })

export const themes = {
  default: {
    light: {
      colors: {
        bg: 'zinc-50',
        surface: 'white',
        'surface-2': 'zinc-100',
        border: 'zinc-200',
        'border-subtle': 'zinc-100',
        'border-control': 'zinc-450',
        fg: 'zinc-950',
        'fg-muted': 'zinc-600',
        'fg-subtle': 'zinc-550',
        accent: 'zinc-850',
        'accent-fg': 'zinc-50',
        'accent-text': 'zinc-850',
        'accent-2': 'zinc-700',
        'accent-2-fg': 'zinc-50',
        'accent-2-text': 'zinc-700',
        success: 'green-700',
        warning: 'amber-700',
        danger: 'red-700',
        info: 'blue-700',
        ring: 'zinc-850'
      },
      effects: {
        glow: 'none',
        'shadow-card-v': [
          { x: 0, y: 1, blur: 2, color: tint('black', 4) },
          { x: 0, y: 4, blur: 24, spread: -8, color: tint('black', 8) }
        ],
        'gradient-signal': 'signal-print',
        'texture-grid': 'none',
        'badge-service-tint': 0
      }
    },
    dark: {
      colors: {
        bg: 'zinc-950',
        surface: 'zinc-900',
        'surface-2': 'zinc-850',
        border: 'zinc-800',
        'border-subtle': 'zinc-850',
        'border-control': 'zinc-550',
        fg: 'zinc-100',
        'fg-muted': 'zinc-400',
        'fg-subtle': 'zinc-450',
        accent: 'zinc-50',
        'accent-fg': 'zinc-950',
        'accent-text': 'zinc-50',
        'accent-2': 'zinc-300',
        'accent-2-fg': 'zinc-950',
        'accent-2-text': 'zinc-300',
        success: 'green-400',
        warning: 'amber-400',
        danger: 'red-400',
        info: 'blue-400',
        ring: 'zinc-200'
      },
      effects: {
        glow: [{ x: 0, y: 0, blur: 40, spread: -10, color: tint('white', 8) }],
        'shadow-card-v': [{ x: 0, y: 0, blur: 0, spread: 1, color: tint('white', 5) }],
        'gradient-signal': 'signal-neon',
        'texture-grid': 'none',
        'badge-service-tint': 14
      }
    }
  },
  cyberpunk: {
    light: {
      colors: {
        bg: 'mist-50',
        surface: 'white',
        'surface-2': 'mist-100',
        border: 'mist-200',
        'border-subtle': 'mist-100',
        'border-control': 'slate-600',
        fg: 'slate-950',
        'fg-muted': 'slate-700',
        'fg-subtle': 'slate-600',
        accent: 'neon-cyan',
        'accent-fg': 'void-950',
        'accent-text': 'deep-cyan',
        'accent-2': 'neon-magenta',
        'accent-2-fg': 'void-950',
        'accent-2-text': 'deep-magenta',
        success: 'deep-green',
        warning: 'deep-acid',
        danger: 'deep-red',
        info: 'neon-uv-deep',
        ring: 'deep-cyan'
      },
      effects: {
        glow: [{ x: 0, y: 0, blur: 20, color: tint('deep-cyan', 18) }],
        'shadow-card-v': [{ x: 0, y: 4, blur: 24, spread: -8, color: tint('neon-uv-deep', 12) }],
        'gradient-signal': 'signal-print',
        'texture-grid': { line: tint('slate-950', 4), size: 24 },
        'badge-service-tint': 0
      }
    },
    dark: {
      colors: {
        bg: 'void-950',
        surface: 'void-900',
        'surface-2': 'void-850',
        border: 'void-700',
        'border-subtle': 'void-800',
        'border-control': 'slate-600',
        fg: 'glacier-100',
        'fg-muted': 'glacier-300',
        'fg-subtle': 'glacier-400',
        accent: 'neon-cyan',
        'accent-fg': 'void-950',
        'accent-text': 'neon-cyan',
        'accent-2': 'neon-magenta',
        'accent-2-fg': 'void-950',
        'accent-2-text': 'neon-magenta',
        success: 'neon-green',
        warning: 'neon-acid',
        danger: 'neon-red',
        info: 'neon-uv',
        ring: 'neon-cyan'
      },
      effects: {
        glow: [
          { x: 0, y: 0, blur: 24, color: tint('neon-cyan', 35) },
          { x: 0, y: 0, blur: 12, inset: true, color: tint('neon-magenta', 12) }
        ],
        'shadow-card-v': [
          { x: 0, y: 0, blur: 0, spread: 1, color: tint('white', 6) },
          { x: 0, y: 0, blur: 40, color: tint('neon-cyan', 6) }
        ],
        'gradient-signal': 'signal-neon',
        'texture-grid': { line: tint('neon-cyan', 4), size: 24 },
        'badge-service-tint': 14
      }
    }
  }
} as const satisfies Record<ThemeName, Record<Mode, ThemeMode>>

/** Mode a theme uses when the user has stored no choice (brand doc §2 Q1). */
export const defaultMode = {
  default: 'system',
  cyberpunk: 'dark'
} as const satisfies Record<ThemeName, Mode | 'system'>

// ---------------------------------------------------------------- 3. Component

/**
 * Component tokens point to semantic tokens (`var(--x)`) or to static tokens.
 * Values are CSS strings with `var()` references only. No colour literals.
 */
export const components = {
  'btn-primary-bg': 'var(--accent)',
  'btn-primary-fg': 'var(--accent-fg)',
  'btn-primary-ring': 'var(--ring)',
  'btn-secondary-bg': 'transparent',
  'btn-secondary-fg': 'var(--fg)',
  'btn-secondary-border': 'var(--border-control)',
  'link-fg': 'var(--accent-text)',
  'link-fg-hover': 'var(--accent-2-text)',
  'card-bg': 'var(--surface)',
  'card-border': 'var(--border)',
  'card-shadow': 'var(--shadow-card-v)',
  'card-radius': 'var(--radius-card)',
  'input-bg': 'var(--surface)',
  'input-border': 'var(--border-control)',
  'select-border': 'var(--border-control)',
  'checkbox-border': 'var(--border-control)',
  'input-border-focus': 'var(--ring)',
  'badge-service-bg':
    'color-mix(in oklch, var(--service-accent) var(--badge-service-tint), transparent)',
  'badge-service-fg': 'var(--service-accent-text)',
  'focus-outline': '2px solid var(--ring)',
  'focus-outline-offset': '2px'
} as const satisfies Record<string, string>

export type ComponentToken = keyof typeof components

// ---------------------------------------------------------------- 4. Service accent

export const serviceNames = ['studio', 'llm', 'vision', 'pulse', 'identity', 'widgets'] as const
export type ServiceName = (typeof serviceNames)[number]

/** Neon in dark modes, deep in light modes (§4.3). Meta repos use `--gradient-signal`. */
export const services = {
  studio: { neon: 'neon-cyan', deep: 'deep-cyan' },
  llm: { neon: 'neon-magenta', deep: 'deep-magenta' },
  vision: { neon: 'neon-green', deep: 'deep-green' },
  pulse: { neon: 'neon-acid', deep: 'deep-acid' },
  identity: { neon: 'neon-uv', deep: 'neon-uv-deep' },
  widgets: { neon: 'neon-blue', deep: 'deep-blue' }
} as const satisfies Record<ServiceName, { neon: Primitive; deep: Primitive }>

// ---------------------------------------------------------------- 5. Static tokens

export const motion = {
  duration: {
    instant: '80ms',
    fast: '150ms',
    base: '200ms',
    slow: '320ms',
    warp: '550ms'
  },
  /** Every duration under `prefers-reduced-motion: reduce`. */
  reducedDuration: '0.01ms',
  ease: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    'spring-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
} as const

export const radii = {
  sm: '0.5rem',
  md: '0.75rem',
  card: '1.5rem',
  pill: '9999px'
} as const

export const fonts = {
  display: {
    family: 'Space Grotesk',
    weights: [500, 700],
    stack: '"Space Grotesk", Inter, system-ui, sans-serif'
  },
  sans: {
    family: 'Inter',
    weights: [400, 650],
    stack: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
  },
  mono: {
    family: 'JetBrains Mono',
    weights: [400, 700],
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
  }
} as const

export interface TextStep {
  readonly size: number
  readonly lineHeight: number
  readonly tracking?: string
}

/** Type scale in px (§5.1). The CSS uses rem (px / 16). */
export const textScale = {
  xs: { size: 12, lineHeight: 16, tracking: '0.14em' },
  sm: { size: 13, lineHeight: 20 },
  base: { size: 15, lineHeight: 24 },
  lg: { size: 17, lineHeight: 26 },
  xl: { size: 20, lineHeight: 28 },
  '2xl': { size: 24, lineHeight: 30 },
  '3xl': { size: 30, lineHeight: 36 },
  '5xl': { size: 48, lineHeight: 52, tracking: '-0.02em' }
} as const satisfies Record<string, TextStep>
