# Changelog

All notable changes to the Synthwerk SDK. Each package has its own version; an entry names the package and version it changes. Release headings below 0.3.0 are `@synthwerk/tokens` versions.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This repo does not use Semantic Versioning strictly: versions below 1.0.0 may change the API.

## [Unreleased]

### Added

- **`@synthwerk/sdk` 0.1.0 (#35).** Framework-free core for the browser and Node 24. Not on npm yet. See `docs/features/sdk-core.md`.
  - Token-mode sign-in: the host hands in `getToken`. The SDK stores no token.
  - Typed `openapi-fetch` clients for identity and llm, generated from `synthwerk-contracts` `4991c3a`.
  - `sw.llm.chat()` streams `delta`, `usage`, `done` and `error` events.
  - One `SynthwerkError` maps 401, quota, offline, stall and proxy errors.
- **Four groups (vm-brand B-52).** `data-group="flagship|lab|ops|venture"`. Ops is magenta `#EE4FFF` (B-34), venture is amber (B-42). The `default` theme values come from vm-brand `brand.json` through the generated `packages/tokens/src/brand-groups.json` (vm-brand `scripts/group-tokens.py`; vm-brand CI fails on drift). New exports: `deprecatedGroupAliases`, `resolveGroupName`, `contrastAccents`, `groupStyleNames`, `groupDisplayFonts`, `plainGroupStyle`, `primitiveForHex`, `groupSelector`. `tokens.json` gets `groups.<g>.style` and `groupAliases`.
- **Group style (B-46).** Every group rule sets `--group-font-display`, `--group-corner`, `--group-ornament` and `--group-tracking`. Venture: Cinzel, `0.15`, `1`, `0.02em`. Other groups keep the D-41 look.
- Primitives `magenta-400`, `fuchsia-300`, `fuchsia-700`, `fuchsia-800`.
- **`@synthwerk/ui-vue` 0.1.0 (`synthwerk-ui`).** Seven Vue 3.5 components from the Figma library: button, pill, input, card, status pill, terminal snippet and divider. They read tokens only. Each has dark and light, focus and disabled states. A test checks text contrast of 4.5:1 or more for every theme, mode and group.
- **Group accents (VM. studio).** `data-group="flagship|vlm|rig"` switches `--accent-2`, `--accent-2-fg`, `--accent-2-text`, `--ring` and the new `--group-fill`. Missing = `flagship`, so the look does not change for current pages. New exports: `groups`, `groupNames`, `groupColorNames`, `defaultGroup`, `resolveRefs`; `resolveColors` takes an optional group. Tailwind gets `color-group`.
- Primitives `violet-300`, `violet-800`, `amber-500`.

### Deprecated

- `data-group="vlm"` and `data-group="rig"`: aliases of `lab` and `ops` for one release. `rig` is magenta now; the amber rig (B-30) is superseded. `resolveColors` and `resolveRefs` still take the old names.

### Changed

- **Dark page and line from vm-brand.** `default` dark `--bg` is `#0A0A0B` and `--border` is `#26262B` (vm-brand `brand.json` `base.dark.page`, `base.dark.line`). New primitives `night-950`, `night-700`. The `graphite` primitives keep their values.
- **`brand.night` is the dark page (B-54).** The brand palette name `night` now points to `night-950` `#0A0A0B`, like `--bg`. `tokens.json` `brand.night` changes from `graphite-950` to `night-950`. Ink on an accent fill (`accent-fg`, `accent-2-fg`, group ink) and the logo assets keep `graphite-950`.
- `@synthwerk/tokens` 0.3.0: four groups. `groups` and `GroupName` hold `flagship`, `lab`, `ops`, `venture`; `groups.vlm` and `groups.rig` are gone (the package was never published). `@synthwerk/ui-vue` peer range is `^0.3.0`.
- `@synthwerk/tokens` 0.2.0: the public look (D-41). See `docs/ecosystem-plan/07c-public-presence.md`.

## [0.2.0]

### Changed

- **Public look (D-41).** `default` light matches velimir-mueller.de, `default` dark matches the code-context dashboard. It replaces the neon cyan/magenta look.
- **`cyberpunk` theme removed.** The package was not published, so no API is broken. A stored `cyberpunk` choice from 0.1.0 falls back to `default`. A `contrast` theme was added in its place.
- **Fonts.** Display font changed from Space Grotesk to Space Mono. Body stays Inter, code stays JetBrains Mono.
- **Logo.** The wordmark is now `SYNTHWERK.` in Space Mono Bold, outlined into paths, plus an `S.` monogram tile for favicons and app icons. The old "Patch" squiggle assets were removed.
- **Service accents.** A calm set from the dashboard status colours: studio indigo, llm violet, vision pink, pulse amber, identity blue, widgets teal.

### Fixed

- **Contrast.** Three reference values failed AA text contrast (4.5:1). They are kept for non-text use; a passing text variant was added:

| Reference value | Failed on | Ratio | Text variant | Ratio |
|---|---|---|---|---|
| Dark sub-text `#63637A` | `#0C0C10` | 3.34:1 | `--fg-subtle` `#8A8AA0` (graphite-400) | 5.79:1 |
| Emerald `#10B981` | white | 2.43:1 | `--success` light `#047857` (emerald-700) | 5.25:1 |
| Indigo `#6366F1` | `#FAFAFA` | 4.28:1 | `--accent-2-text` light `#4F46E5` (indigo-600) | 6.02:1 |

- **Control boundaries.** Reference borders are decorative only. Added `--border-control`: `#8A8A93` in light (3.28:1) and `#6B6B84` in dark (3.78:1), both ≥ 3:1 on every surface (WCAG 1.4.11).

## [0.1.0]

### Added

- `@synthwerk/tokens` with the typed token source, `tokens.css`, `tailwind.css`, `tokens.json`, the theme and mode switch, and the first demo page.
