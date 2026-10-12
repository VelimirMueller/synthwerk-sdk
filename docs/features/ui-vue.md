---
title: UI components for Vue
slug: ui-vue
status: beta
epic: E1
owner: sdk
paths: ["packages/ui-vue/src/**", "packages/ui-vue/scripts/**"]
api: []
events: []
mcp: []
updated: 2026-10-13
---

# UI components for Vue

> **In 30 seconds**
> - `@synthwerk/ui-vue` is `synthwerk-ui` for Vue 3.5: the Figma components in code.
> - First set: button, pill, input, card, status pill, terminal snippet and divider.
> - Components read `@synthwerk/tokens` only. Dark, light and contrast come from the tokens.
> - A test checks text contrast of 4.5:1 or more for every theme, mode and group.

## What it does

- Each component is a Vue component with a render function. There is no SFC build step.
- `ui.css` holds all styles. Every colour, radius, font and duration is a token variable.
- Every component has a visible focus ring (`--focus-outline`) and a disabled state.
- The mode switch is the one of `@synthwerk/tokens`: `data-mode` on `<html>`.

| Component | Figma set | Kinds | States |
|---|---|---|---|
| `SwButton` | Button | primary, secondary, ghost · md, sm | hover, focus, disabled |
| `SwPill` | Badge | neutral, accent, solid · span or button | focus, disabled |
| `SwStatusPill` | Status pill | live, building, planned, blocked | focus, disabled |
| `SwInput` | Input | text field with `v-model` | focus, invalid, disabled |
| `SwCard` | Card | article or link (`href`) | hover, focus, disabled |
| `SwDivider` | Divider | line, label, vertical | focus, disabled |
| `SwTerminalSnippet` | Terminal snippet | command with copy, session with lines | focus, disabled |

## How to use

1. Install the packages: `pnpm add @synthwerk/ui-vue @synthwerk/tokens vue`.
2. Import the CSS. Tokens come first:

   ```css
   @import "@synthwerk/tokens/tokens.css";
   @import "@synthwerk/ui-vue/ui.css";
   ```

3. Import the components:

   ```ts
   import { SwButton, SwStatusPill } from '@synthwerk/ui-vue'
   ```

4. Set `data-theme` and `data-mode` on `<html>` as described in [brand-tokens.md](brand-tokens.md).

## Rules and limits

| Rule | Value |
|---|---|
| Colour and size | Token variables only. A test fails on a hex, `rgb()` or a length in a component rule. |
| Foundations | `--sw-space` (Tailwind `--spacing`, else 0.25 rem), `--sw-hairline` (1 px), `--sw-tracking-label` (0.15 em), `--sw-disabled-opacity` (0.4). Only in the first block of `ui.css`. |
| Text contrast | ≥ 4.5:1 for every text of every component, both themes, both modes, all groups. |
| Disabled | 40 % opacity. WCAG 1.4.3 does not apply to inactive controls. |
| Status and accent tints | 5 % fill. Figma uses 10 % and 14 %; these fail 4.5:1 in light mode. |
| Emerald | Status `live` only. |
| Vue | `^3.5.0` (peer). |

## Events

| Type | When |
|---|---|
| None. | |

## Errors

| Status | Problem type | Cause |
|---|---|---|
| None. | | |

## Tests

- `tests/unit/ui-vue/components.test.ts` — `render, click, v-model, copy - per state - expected markup and events`
- `tests/unit/ui-vue/css.test.ts` — `ui.css rule - value - tokens only`
- `tests/unit/ui-vue/css.test.ts` — `component text on bg and surface - theme × mode × group - at least 4.5:1`
- `tests/unit/ui-vue/css.test.ts` — `component root - focus-visible - focus token outline`

## Changes

| Date | Change |
|---|---|
| 2026-10-13 | First version: seven components (issue VelimirMueller/synthwerk#10). |
