---
title: Brand tokens
slug: brand-tokens
status: beta
epic: E0
owner: sdk
paths: ["packages/tokens/src/**", "packages/tokens/scripts/**", "packages/tokens/assets/**", "packages/tokens/demo/**"]
api: []
events: []
mcp: []
updated: 2026-10-09
---

# Brand tokens

> **In 30 seconds**
> - `@synthwerk/tokens` holds the Synthwerk colours, type, radii, shadows and motion as typed data.
> - The build writes `tokens.css`, `tailwind.css`, `tokens.json` and typed JS exports.
> - Two themes (`default`, `cyberpunk`) × two modes (`light`, `dark`). Every text pair passes WCAG AA.
> - Source of truth for the values: `docs/ecosystem-plan/07-brand-and-styling.md`.

## What it does

- `src/tokens.ts` is the single source. It has four layers: primitive, semantic, component and service.
- Only the primitive layer contains hex values. The other layers point to primitive names.
- `tokens.css` sets CSS custom properties on `:root` and on every `[data-theme]` element.
- `tailwind.css` maps the variables to Tailwind 4 utilities with `@theme inline`.
- `tokens.json` gives the resolved hex values for charts and canvas code.
- `[data-service="<name>"]` sets `--service-accent` and `--service-accent-text`. Nothing else changes per service.
- `prefers-reduced-motion: reduce` sets every duration to `0.01ms`.
- `assets/` holds the logo, wordmark and mark in light and dark. The wordmark text is outlined.

## How to use

1. Install the package: `pnpm add @synthwerk/tokens`.
2. Import the CSS after Tailwind:

   ```css
   @import "tailwindcss";
   @import "@synthwerk/tokens/tokens.css";
   @import "@synthwerk/tokens/tailwind.css";
   ```

3. Inline `firstPaintScript` (export of the package) in `<head>`, before the stylesheets.
4. Store the user choice as JSON in `localStorage["sw:prefs:v1"]`: `{ "theme": "cyberpunk", "mode": "system" }`.
5. Set `data-theme` and `data-mode` on `<html>` when the user changes the choice.
6. Use semantic utilities in markup: `bg-surface`, `text-fg-muted`, `ring-ring`, `bg-service`.

## Rules and limits

| Rule | Value |
|---|---|
| Theme switch | `data-theme="default \| cyberpunk"` on `<html>`. Missing = `default`. |
| Mode switch | `data-mode="light \| dark \| system"` on `<html>`. Missing = nothing stored. |
| Nothing stored, `default` | Follows the OS (`prefers-color-scheme`). |
| Nothing stored, `cyberpunk` | Dark. |
| Stored choice | Always wins over the OS. |
| Body text contrast | ≥ 4.5:1 on `--bg`, `--surface` and `--surface-2` |
| UI contrast (`--ring`, `--border-control`, print signal on paper) | ≥ 3:1 on `--bg`, `--surface` and `--surface-2` |
| Control boundary (input, select, checkbox, secondary button) | `--border-control` (WCAG 1.4.11). `--border` is for decorative dividers only. |
| Service badge | Text `--service-accent-text`. Fill tint 0 % in light modes, 14 % neon in dark modes. Text ≥ 4.5:1 on the fill. |
| `tokens.css` size | ≤ 8 KB gzip (now 2.7 KB) |
| Fonts | Space Grotesk, Inter, JetBrains Mono. SIL OFL 1.1. Self-hosted. Not bundled. |
| Reduced motion | All durations `0.01ms`. Animations run one time. |

## Events

| Type | When |
|---|---|
| None. | |

## Errors

| Status | Problem type | Cause |
|---|---|---|
| None. | | |

## Tests

- `tests/unit/tokens/contrast.test.ts` — `text token on surface - every theme × mode - at least 4.5`
- `tests/unit/tokens/contrast.test.ts` — `border-control (UI, WCAG 1.4.11) on surface - ratio - at least 3`
- `tests/unit/tokens/contrast.test.ts` — `service badge text on badge fill - ratio - at least 4.5`
- `tests/unit/tokens/contrast.test.ts` — `brand doc §6 tables - computed ratios - equal the doc`
- `tests/unit/tokens/css.test.ts` — `theme × mode block - every semantic token - declared`
- `tests/unit/tokens/css.test.ts` — `Tailwind 4 compile - token utilities - map to the runtime variables`
- `tests/unit/tokens/layers.test.ts` — `semantic layer - all themes and modes - has no hex and no colour function`
- `tests/unit/tokens/theme.test.ts` — `resolveMode - cyberpunk, nothing stored - dark`
- `tests/unit/tokens/assets.test.ts` — `logo asset - text - outlined`
- `packages/tokens/scripts/screenshots.ts` — checks the theme rules in Chromium and writes the review screenshots.

## Changes

| Date | Change |
|---|---|
| 2026-10-09 | Add `--border-control` (3:1 control boundaries, WCAG 1.4.11). Badge fill tint is 0 % in light modes. |
| 2026-10-09 | First version (story S-E0-10). |
