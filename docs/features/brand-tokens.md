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
updated: 2026-10-22
---

# Brand tokens

> **In 30 seconds**
> - `@synthwerk/tokens` holds the Synthwerk colours, type, radii, shadows and motion as typed data.
> - The build writes `tokens.css`, `tailwind.css`, `tokens.json` and typed JS exports.
> - Two themes (`default`, `contrast`) × two modes (`light`, `dark`). Every text pair passes WCAG AA.
> - `default` is the public look (D-41): light = velimir-mueller.de, dark = the code-context dashboard.
> - Source of truth for the values: `docs/ecosystem-plan/07c-public-presence.md`.

## What it does

- `src/tokens.ts` is the single source. It has four layers: primitive, semantic, component and service.
- Only the primitive layer contains hex values. The other layers point to primitive names.
- `tokens.css` sets CSS custom properties on `:root` and on every `[data-theme]` element.
- `tailwind.css` maps the variables to Tailwind 4 utilities with `@theme inline`.
- `tokens.json` gives the resolved hex values for charts and canvas code.
- `[data-group="flagship|lab|ops|venture"]` sets the VM. studio group accent: `--accent-2`, `--accent-2-fg`, `--accent-2-text`, `--ring` and the graphic `--group-fill`. Missing = `flagship` (indigo, unchanged look).
- Every group rule also sets the group style: `--group-font-display`, `--group-corner` (factor on the radii), `--group-ornament` (`0` or `1`) and `--group-tracking`. Only `venture` changes them (B-46: Cinzel, `0.15`, `1`, `0.02em`).
- `src/brand-groups.json` holds the group colours and the venture style. vm-brand `scripts/group-tokens.py` generates it from vm-brand `brand.json`. Do not edit it; vm-brand CI fails when it differs.
- `data-group="vlm"` and `data-group="rig"` are deprecated aliases of `lab` and `ops` for one release.
- `[data-service="<name>"]` sets `--service-accent` and `--service-accent-text`. Nothing else changes per service.
- `prefers-reduced-motion: reduce` sets every duration to `0.01ms`.
- `assets/` holds the `SYNTHWERK.` logo, wordmark and the `S.` mark in light and dark, plus a favicon. The wordmark text is outlined in Space Mono Bold.

## The look (D-41)

- Fonts: Inter (body), Space Mono (display, labels, pills, code snippets), JetBrains Mono (code blocks).
- `default` light matches velimir-mueller.de: page `#FAFAFA`, card `#FFFFFF`, line `#E4E4E7`, ink `#18181B`, sub `#71717A`.
- `default` dark matches the code-context dashboard. Page and line come from vm-brand `brand.json` (`base.dark.page`, `base.dark.line`).
- The dark page is `#0A0A0B` on every surface (vm-brand B-54): `--bg` and the brand palette name `brand.night` both use `night-950`. Ink on an accent fill (`accent-fg`, `accent-2-fg`, group ink) and the logo tile ink stay `graphite-950` `#0C0C10`; they are text, not a page.
- Dark page `#0A0A0B`, panels `#131318` / `#18181F` / `#1E1E28`, lines `#1C1C28` / `#26262B`, text `#E4E4E7` / `#A1A1AA`.
- Accents: emerald `#10B981` / `#34D399` (primary) and indigo `#6366F1` (accent line).
- Status colours: amber `#FBBF24`, pink `#F472B6`, violet `#A78BFA`, red `#F87171`, blue `#3B82F6`.
- The primary button is a white pill on dark and a near-black pill on light.
- Card radius is 24 px, dashboard panels 14 px, pills fully rounded.

## How to use

1. Install the package: `pnpm add @synthwerk/tokens`.
2. Import the CSS after Tailwind:

   ```css
   @import "tailwindcss";
   @import "@synthwerk/tokens/tokens.css";
   @import "@synthwerk/tokens/tailwind.css";
   ```

3. Inline `firstPaintScript` (export of the package) in `<head>`, before the stylesheets.
4. Store the user choice as JSON in `localStorage["sw:prefs:v1"]`: `{ "theme": "default", "mode": "system" }`.
5. Set `data-theme` and `data-mode` on `<html>` when the user changes the choice.
6. Use semantic utilities in markup: `bg-surface`, `text-fg-muted`, `ring-ring`, `bg-service`.

## Rules and limits

| Rule | Value |
|---|---|
| Theme switch | `data-theme="default \| contrast"` on `<html>`. Missing = `default`. |
| Group switch | `data-group="flagship \| lab \| ops \| venture"` on `<html>` or any element. Missing = `flagship`. Set once per site, not stored. `vlm` and `rig` are deprecated aliases of `lab` and `ops` (removed in the next minor release). |
| Mode switch | `data-mode="light \| dark \| system"` on `<html>`. Missing = nothing stored. |
| Nothing stored | Both themes follow the OS (`prefers-color-scheme`). |
| Stored choice | Always wins over the OS. |
| Body text contrast | ≥ 4.5:1 on `--bg`, `--surface` and `--surface-2` |
| UI contrast (`--ring`, `--border-control`, print signal on paper) | ≥ 3:1 on `--bg`, `--surface` and `--surface-2` |
| Control boundary (input, select, checkbox, secondary button) | `--border-control` (WCAG 1.4.11). `--border` is for decorative dividers only. |
| Group accents | Flagship indigo, lab violet, ops magenta, venture amber (vm-brand playbook B-34, B-42, B-52). `default` values come from vm-brand `brand.json`; `contrast` values are `contrastAccents` in `src/tokens.ts`. Text meets AA in `default` and AAA in `contrast`. Emerald stays status; group accents never go on status chips. |
| Group style | `--group-font-display`, `--group-corner`, `--group-ornament`, `--group-tracking`. Venture only (B-46). Load Cinzel yourself; the package does not bundle it. |
| Service badge | Text `--service-accent-text`. Fill tint 8 % in light modes, 14 % in dark modes. Text ≥ 4.5:1 on the fill. |
| `tokens.css` size | ≤ 8 KB gzip |
| Fonts | Space Mono, Inter, JetBrains Mono. SIL OFL 1.1. Self-hosted. Not bundled. |
| Reduced motion | All durations `0.01ms`. Animations run one time. |
| Legacy `cyberpunk` | Dropped in 0.2.0. A stored `cyberpunk` choice falls back to `default`. |

## Contrast

- `default` meets AA. `contrast` meets AAA: text ≥ 7:1, control borders ≥ 4.5:1, no glow, no grid, no badge tint.
- Three reference values did not reach 4.5:1. The value stays for non-text use; a text variant was added:

| Reference | Fails on | Ratio | Text variant | Ratio |
|---|---|---|---|---|
| Dark sub-text `#63637A` | `#0C0C10` | 3.34:1 | `--fg-subtle` `#8A8AA0` | 5.79:1 |
| Emerald `#10B981` | white | 2.43:1 | `--success` light `#047857` | 5.25:1 |
| Indigo `#6366F1` | `#FAFAFA` | 4.28:1 | `--accent-2-text` light `#4F46E5` | 6.02:1 |

- `--border` (light `#E4E4E7`, dark `#26262B`) is decorative. `--border-control` is a darker step: `#8A8A93` in light (3.28:1), `#6B6B84` in dark (3.83:1).

### Text on surfaces

| Theme · mode | `fg` | `fg-muted` | `fg-subtle` | `success` | `warning` | `danger` | `info` |
|---|---|---|---|---|---|---|---|
| `default` light | 16.97 | 7.41 | 5.05 | 5.25 | 4.81 | 6.20 | 6.42 |
| `default` dark | 15.60 | 7.72 | 5.86 | 7.80 | 11.85 | 7.15 | 7.78 |
| `contrast` light | 19.90 | 10.44 | 7.73 | 7.68 | 9.07 | 8.31 | 8.72 |
| `contrast` dark | 21.00 | 14.21 | 10.20 | 13.78 | 14.56 | 11.06 | 11.65 |

- Ratios are the lower of `--bg` and `--surface-2`. See `tests/unit/tokens/fixtures/brand-doc-contrast.ts` for the full tables.
- `--ring` on `--bg`: `default` light 6.02, dark 6.63; `contrast` light 9.93, dark 10.53.
- `--border-control` on `--bg` / `--surface` / `--surface-2`: `default` light 3.28 / 3.42 / 3.11, dark 3.83 / 3.58 / 3.42.

### Service accents

| Service | Dark step | Light step |
|---|---|---|
| studio | indigo-400 `#818CF8` | indigo-700 `#4338CA` |
| llm | violet-400 `#A78BFA` | violet-700 `#6D28D9` |
| vision | pink-400 `#F472B6` | pink-700 `#BE185D` |
| pulse | amber-400 `#FBBF24` | amber-800 `#92400E` |
| identity | blue-400 `#60A5FA` | blue-700 `#1D4ED8` |
| widgets | teal-400 `#2DD4BF` | teal-700 `#0F766E` |

- The dark step is the badge fill in all modes and the text in dark modes. The light step is the text in light modes.

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
- `tests/unit/tokens/theme.test.ts` — `resolveMode - default, nothing stored - follows the OS`
- `tests/unit/tokens/groups.test.ts` — `group - default theme - uses the brand.json hex values`
- `tests/unit/tokens/groups.test.ts` — `default dark, group flagship - --bg - is brand.json base.dark.page`
- `tests/unit/tokens/groups.test.ts` — `brand.night - primitive - is the dark page`
- `tests/unit/tokens/groups.test.ts` — `venture rule - css - declares the style properties`
- `tests/unit/tokens/groups.test.ts` — `data-group="vlm" - css - shares the rule of lab`
- `tests/unit/tokens/assets.test.ts` — `logo asset - text - outlined`
- `tests/unit/tokens/serve.test.ts` — `malformed URL - /%E0 - answers 400 and the server keeps running`
- `tests/unit/tokens/serve.test.ts` — `main-module check - script in a path with a space and a non-ASCII letter - starts`
- `packages/tokens/scripts/screenshots.ts` — checks the theme rules in Chromium and writes the review screenshots.

## Changes

| Date | Change |
|---|---|
| 2026-10-22 | The dark page is `#0A0A0B` (vm-brand B-54): default dark `--bg`, `--border` and `brand.night` come from `brand.json` `base.dark`. Tests pin the page (#11, #12). |
| 2026-10-21 | Four groups `flagship`, `lab`, `ops` (magenta), `venture` (amber, B-46 style) from vm-brand `brand.json` via `src/brand-groups.json`. `vlm` and `rig` stay as deprecated aliases (vm-brand#15, #16). |
| 2026-10-13 | `pnpm demo` and `pnpm fonts` use `import.meta.main`, so they start from paths with spaces, non-ASCII letters or symlinks. The demo server answers 400 to a malformed URL (#8). |
| 2026-10-09 | Public look (D-41): `default` is the website + dashboard look. `cyberpunk` is removed. `contrast` is added for low vision. |
| 2026-10-09 | Add `--border-control` (3:1 control boundaries, WCAG 1.4.11). Badge fill tint is 0 % in light modes. |
| 2026-10-09 | First version (story S-E0-10). |
