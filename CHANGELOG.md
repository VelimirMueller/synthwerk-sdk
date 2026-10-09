# Changelog

All notable changes to the Synthwerk SDK. The version is the version of `@synthwerk/tokens` until a second package exists.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This repo does not use Semantic Versioning strictly: versions below 1.0.0 may change the API.

## [Unreleased]

### Added

- **Group accents (VM. studio).** `data-group="flagship|vlm|rig"` switches `--accent-2`, `--accent-2-fg`, `--accent-2-text`, `--ring` and the new `--group-fill`. Missing = `flagship`, so the look does not change for current pages. New exports: `groups`, `groupNames`, `groupColorNames`, `defaultGroup`, `resolveRefs`; `resolveColors` takes an optional group. Tailwind gets `color-group`.
- Primitives `violet-300`, `violet-800`, `amber-500`.

### Changed

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
