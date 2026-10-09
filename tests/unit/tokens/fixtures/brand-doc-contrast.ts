// Contrast tables copied from docs/features/brand-tokens.md § Contrast (2026-10-09, D-41 look).
// The tests compare the computed ratios with these numbers. Do not "fix" a number here to make a
// test pass: a difference means the feature doc or the tokens changed. Fix the source, then this file.
import type { ThemeName } from '../../../../packages/tokens/src/tokens.ts'

type Row = readonly [token: string, onBg: number, onSurface2: number | null, grade: 'AAA' | 'AA']

export const textTable: Record<`${ThemeName}·${'light' | 'dark'}`, readonly Row[]> = {
  default·light: [
    ['fg', 16.97, 16.12, 'AAA'],
    ['fg-muted', 7.41, 7.03, 'AAA'],
    ['fg-subtle', 5.05, 4.8, 'AA'],
    ['accent-text', 16.97, 16.12, 'AAA'],
    ['accent-2-text', 6.02, 5.72, 'AA'],
    ['success', 5.25, 4.99, 'AA'],
    ['warning', 4.81, 4.57, 'AA'],
    ['danger', 6.2, 5.89, 'AA'],
    ['info', 6.42, 6.1, 'AA'],
    ['accent-fg/accent', 16.97, null, 'AAA'],
    ['accent-2-fg/accent-2', 6.29, null, 'AA']
  ],
  default·dark: [
    ['fg', 15.39, 13.92, 'AAA'],
    ['fg-muted', 7.62, 6.89, 'AA'],
    ['fg-subtle', 5.79, 5.23, 'AA'],
    ['accent-text', 18.7, 16.92, 'AAA'],
    ['accent-2-text', 6.54, 5.92, 'AA'],
    ['success', 7.7, 6.96, 'AA'],
    ['warning', 11.69, 10.58, 'AAA'],
    ['danger', 7.06, 6.38, 'AA'],
    ['info', 7.68, 6.95, 'AA'],
    ['accent-fg/accent', 18.7, null, 'AAA'],
    ['accent-2-fg/accent-2', 6.54, null, 'AA']
  ],
  contrast·light: [
    ['fg', 19.9, 19.06, 'AAA'],
    ['fg-muted', 10.44, 10.01, 'AAA'],
    ['fg-subtle', 7.73, 7.41, 'AAA'],
    ['accent-text', 19.9, 19.06, 'AAA'],
    ['accent-2-text', 9.93, 9.52, 'AAA'],
    ['success', 7.68, 7.36, 'AAA'],
    ['warning', 9.07, 8.69, 'AAA'],
    ['danger', 8.31, 7.96, 'AAA'],
    ['info', 8.72, 8.36, 'AAA'],
    ['accent-fg/accent', 19.9, null, 'AAA'],
    ['accent-2-fg/accent-2', 9.93, null, 'AAA']
  ],
  contrast·dark: [
    ['fg', 21, 17.72, 'AAA'],
    ['fg-muted', 14.21, 11.99, 'AAA'],
    ['fg-subtle', 10.2, 8.6, 'AAA'],
    ['accent-text', 21, 17.72, 'AAA'],
    ['accent-2-text', 10.53, 8.89, 'AAA'],
    ['success', 13.78, 11.62, 'AAA'],
    ['warning', 14.56, 12.29, 'AAA'],
    ['danger', 11.06, 9.33, 'AAA'],
    ['info', 11.65, 9.82, 'AAA'],
    ['accent-fg/accent', 21, null, 'AAA'],
    ['accent-2-fg/accent-2', 10.53, null, 'AAA']
  ]
}

/** `--ring` on `--bg` (UI, needs 3:1). */
export const ringOnBg = {
  default·light: 6.02,
  default·dark: 6.54,
  contrast·light: 9.93,
  contrast·dark: 10.53
} as const

/** `--border-control` on [--bg, --surface, --surface-2] (UI, needs 3:1, WCAG 1.4.11). */
export const borderControlTable = {
  default·light: [3.28, 3.42, 3.11],
  default·dark: [3.78, 3.58, 3.42],
  contrast·light: [10.44, 10.44, 10.01],
  contrast·dark: [8.19, 7.76, 6.91]
} as const

/** Service accents: dark step on [graphite-950, graphite-850, black, zinc-850]; light step on [zinc-50, zinc-100, white]. */
export const serviceTable = {
  studio: { dark: [6.54, 5.92, 7.04, 5.94], light: [7.57, 7.19, 7.9] },
  llm: { dark: [7.17, 6.49, 7.72, 6.51], light: [6.81, 6.46, 7.1] },
  vision: { dark: [7.37, 6.67, 7.93, 6.69], light: [5.78, 5.49, 6.04] },
  pulse: { dark: [11.69, 10.58, 12.58, 10.61], light: [6.79, 6.45, 7.09] },
  identity: { dark: [7.68, 6.95, 8.26, 6.97], light: [6.42, 6.1, 6.7] },
  widgets: { dark: [10.49, 9.49, 11.28, 9.52], light: [5.24, 4.98, 5.47] }
} as const

/** Public presence notes (07c): status pill, accent line and edge glow stops. */
export const brandNotes = {
  emeraldOnNight: 7.7,
  emeraldPrintOnPaper: 5.25,
  indigoOnNight: 4.37,
  indigoPrintOnPaper: 6.02,
  edgeLightStopsOnPaper: [3.59, 5.46],
  edgeDarkStopsOnNight: [7.84, 4.61]
} as const
