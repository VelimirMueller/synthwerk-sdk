// Contrast tables copied from docs/ecosystem-plan/07-brand-and-styling.md §6 (2026-10-09).
// The tests compare the computed ratios with these numbers. Do not "fix" a number here to make a
// test pass: a difference means the brand doc or the tokens changed. Fix the source, then this file.
import type { ThemeName } from '../../../../packages/tokens/src/tokens.ts'

type Row = readonly [token: string, onBg: number, onSurface2: number | null, grade: 'AAA' | 'AA']

export const textTable: Record<`${ThemeName}·${'light' | 'dark'}`, readonly Row[]> = {
  default·light: [
    ['fg', 19.06, 18.1, 'AAA'],
    ['fg-muted', 7.41, 7.03, 'AAA'],
    ['fg-subtle', 5.05, 4.8, 'AA'],
    ['accent-2-text', 10.01, 9.5, 'AAA'],
    ['success', 4.81, 4.56, 'AA'],
    ['warning', 4.81, 4.57, 'AA'],
    ['danger', 6.2, 5.89, 'AA'],
    ['info', 6.42, 6.1, 'AA'],
    ['accent-fg/accent', 16.97, null, 'AAA']
  ],
  default·dark: [
    ['fg', 18.1, 16.12, 'AAA'],
    ['fg-muted', 7.76, 6.91, 'AA'],
    ['fg-subtle', 5.81, 5.18, 'AA'],
    ['accent-2-text', 13.46, 11.99, 'AAA'],
    ['success', 11.42, 10.17, 'AAA'],
    ['warning', 11.92, 10.61, 'AAA'],
    ['danger', 7.19, 6.4, 'AA'],
    ['info', 7.83, 6.97, 'AA'],
    ['accent-fg/accent', 19.06, null, 'AAA']
  ],
  cyberpunk·light: [
    ['fg', 18.32, 17.18, 'AAA'],
    ['fg-muted', 8.21, 7.7, 'AAA'],
    ['fg-subtle', 5.37, 5.04, 'AA'],
    ['accent-text', 4.99, 4.68, 'AA'],
    ['accent-2-text', 4.91, 4.6, 'AA'],
    ['success', 5.05, 4.74, 'AA'],
    ['warning', 5.03, 4.72, 'AA'],
    ['danger', 4.95, 4.64, 'AA'],
    ['info', 6.29, 5.9, 'AA'],
    ['accent-fg/accent', 15.99, null, 'AAA']
  ],
  cyberpunk·dark: [
    ['fg', 17.67, 16.43, 'AAA'],
    ['fg-muted', 9.79, 9.1, 'AAA'],
    ['fg-subtle', 6.48, 6.03, 'AA'],
    ['accent-text', 15.99, 14.87, 'AAA'],
    ['accent-2-text', 6.92, 6.43, 'AA'],
    ['success', 15.2, 14.14, 'AAA'],
    ['warning', 18.28, 17.0, 'AAA'],
    ['danger', 5.58, 5.19, 'AA'],
    ['info', 6.29, 5.85, 'AA'],
    ['accent-fg/accent', 15.99, null, 'AAA']
  ]
}

/** `--ring` on `--bg` (UI, needs 3:1). */
export const ringOnBg = {
  default·light: 16.97,
  default·dark: 15.68,
  cyberpunk·light: 4.99,
  cyberpunk·dark: 15.99
} as const

/** `--border-control` on [--bg, --surface, --surface-2] (UI, needs 3:1, WCAG 1.4.11). */
export const borderControlTable = {
  default·light: [3.28, 3.42, 3.11],
  default·dark: [3.77, 3.55, 3.36],
  cyberpunk·light: [5.37, 5.74, 5.04],
  cyberpunk·dark: [3.52, 3.37, 3.27]
} as const

/** Service accents: neon on [void, void-850, zinc-950, zinc-850]; deep on [#FAFAFA, #F4F4F5, #F7F7FB, #EEF0F6]. */
export const serviceTable = {
  studio: { neon: [15.99, 14.87, 15.77, 14.04], deep: [5.11, 4.85, 4.99, 4.68] },
  llm: { neon: [6.92, 6.43, 6.82, 6.07], deep: [5.02, 4.77, 4.91, 4.6] },
  vision: { neon: [15.2, 14.14, 14.99, 13.35], deep: [5.17, 4.91, 5.05, 4.74] },
  pulse: { neon: [18.28, 17.0, 18.02, 16.05], deep: [5.15, 4.89, 5.03, 4.72] },
  identity: { neon: [6.29, 5.85, 6.2, 5.52], deep: [6.44, 6.11, 6.29, 5.9] },
  widgets: { neon: [7.38, 6.86, 7.28, 6.48], deep: [5.1, 4.84, 4.98, 4.67] }
} as const

/** §3.2 and §6 notes. */
export const brandNotes = {
  steelOnPaper: 5.1, // 1 decimal in the doc
  printCyanOnPaper: 3.24,
  printMagentaOnPaper: 3.21,
  neonCyanOnPaper: 1.21,
  neonMagentaOnPaper: 2.8,
  accent2FgOnMagenta: 6.92,
  whiteOnMagenta: 2.92
} as const
