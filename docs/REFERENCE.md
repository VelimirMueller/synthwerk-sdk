# Reference

The long material behind the [README](../README.md). The README keeps the short versions.

## How it works

```text
-- 02 ---------------------------------------------------- HOW IT WORKS --

  src/tokens.ts  (one source: primitive > semantic > component > service)
        |
        v
  +----------------+   +------------------+   +--------------+
  |   tokens.css   |   |   tailwind.css   |   |  tokens.json |
  |  CSS variables |   |  Tailwind 4 map  |   |  hex values  |
  +-------+--------+   +--------+---------+   +------+-------+
          |                     |                    |
          +=========+===========+==========+=========+
                    |                      |
               +----v-----+          +-----v------+     +-----------+
               |  studio  |          |  widgets   |     | SDK apps  |
               +----------+          +------------+     +-----------+

  themes   default (website + dashboard look) . contrast (AAA)
  modes    light . dark . system (default: follow the OS)
```

## Layout

```text
packages/tokens/
  src/        tokens.ts (single source), css.ts (renderers), theme.ts, contrast.ts
  scripts/    build.ts, fonts.ts, outline-wordmark.ts, serve.ts, screenshots.ts
  assets/     SYNTHWERK. logo, wordmark, S. mark (light + dark), favicon
  demo/       static demo page with a theme and mode switch
tests/unit/tokens/   contrast, CSS structure, token layers, theme rules, assets
tools/biome-config/  vendored copy of @synthwerk/biome-config (see its README)
assets/banner/       README banner (synthwerk/scripts/make-banner.py)
```

## Fonts (self-host, SIL OFL 1.1)

| Token | Font | Use |
|---|---|---|
| `--font-display` | Space Mono 400, 700 | Headlines, wordmark, labels, pills |
| `--font-sans` | Inter 400, 600 | Body text and controls |
| `--font-mono` | JetBrains Mono 400, 700 | Code, logs, diffs |

- The package does not bundle font files. Apps self-host them (no Google Fonts at runtime: GDPR, CSP).
- `pnpm --filter @synthwerk/tokens fonts` fetches the pinned files from google/fonts (commit + SHA-256) into `.cache/` (git-ignored). The demo uses them.
- Subset to Latin + Latin-1 Supplement and convert to `woff2` (for example `pyftsubset --flavor=woff2 --unicodes=U+0000-00FF`).
- Ship each font's `OFL.txt` next to its `woff2` files. Declare `@font-face` with `font-display: swap`.

## Logo

- `pnpm --filter @synthwerk/tokens wordmark` outlines `SYNTHWERK.` and the `S.` mark in Space Mono Bold.
- Only outlined paths go into `assets/`. No font binary is committed.

## Roadmap

```text
-- 06 --------------------------------------------------------- ROADMAP --

  tokens 0.1  -->  tokens 0.2  -->  sdk core  -->  vue  -->  react
  (neon v1)       (public look)     (E2)         (E2)      (E7)
                       ^
                      now
```

| Package | Epic | Content |
|---|---|---|
| `@synthwerk/tokens` | E0/E1 | 0.2.0: public look (D-41). Next: `patterns.css`, `oklch()` output. |
| `@synthwerk/sdk` | E2 | Core client generated from synthwerk-contracts, auth modes, query keys. |
| `@synthwerk/vue` | E2 | Vue 3.5 adapter. |
| `@synthwerk/ui-vue` | E1/E4 | UX pattern library (Vue). |
| `@synthwerk/react`, `@synthwerk/ui-react` | E7 | React adapter and patterns. |
| `create-synthwerk-app` | E7 | App scaffolder (React default, Vue option). |

## Deploy and security

- No deploy. Packages go to npmjs.com under `@synthwerk` with changesets and provenance (D-24), after the npm org exists.
- Report a vulnerability through GitHub private vulnerability reporting on this repo.
