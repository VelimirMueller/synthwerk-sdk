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
packages/ui-vue/
  src/        components/*.ts (render functions), ui.css (tokens only), index.ts
  scripts/    build.ts (copies ui.css to dist)
packages/sdk/
  src/        index.ts (public surface), client/ (create, transport, errors), auth/ (token mode),
              llm/ (chat, sse, events), generated/ (openapi-typescript output, never edited)
  contracts/  synthwerk-contracts specs at the pinned commit + contracts.lock.json
  scripts/    codegen.ts (specs -> src/generated; --sync copies from a contracts clone)
              app/ (createSynthwerkApp), state/ (chat, classify, error states, TanStack options),
              identity/widget-session.ts (user token -> widget token)
packages/react/
  src/        provider.ts (SynthwerkProvider), hooks.ts (useAuth, useChat, useClassify)
packages/vue/
  src/        plugin.ts (createSynthwerk, provideSynthwerk), composables.ts
examples/            tiny React and Vue apps on the adapters (typechecked, not built)
tests/unit/tokens/   contrast, CSS structure, token layers, theme rules, assets
tests/unit/ui-vue/   components, tokens-only CSS, text contrast per theme, mode and group
tests/unit/sdk/      auth, transport, errors, SSE and chat, codegen drift, widget session, stores
tests/unit/react/    @synthwerk/react with React Testing Library
tests/unit/vue/      @synthwerk/vue with @vue/test-utils
tests/unit/adapters/ SSR render of both adapters in Node (no window)
tests/integration/sdk/  chat over real HTTP against tests/support/mock-gateway.ts
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
| `@synthwerk/sdk` | E2 | 0.3.0: core client from synthwerk-contracts, token mode, adapter state, TanStack query options. |
| `@synthwerk/vue` | E7 | 0.1.0: Vue 3.5 adapter (#51). |
| `@synthwerk/ui-vue` | E1/E4 | `synthwerk-ui` for Vue. 0.1.0: first seven components. Next: patterns. |
| `@synthwerk/react` | E7 | 0.1.0: React adapter (#51). No UI. |
| `@synthwerk/ui-react` | E7 | React patterns. |
| `create-synthwerk-app` | E7 | App scaffolder (React default, Vue option). |

## Deploy and security

- No deploy. Packages go to npmjs.com under `@synthwerk` (D-24). Nothing is published yet.

### Publish to npm

The five packages are ready: `name`, `version`, `files`, `exports`, `license`, `repository`, `homepage`, `bugs` and `publishConfig.access: public` are set. `prepublishOnly` builds each package. Check the tarballs with `pnpm run pack:all` (writes `.pack/`, git-ignored).

Before the first publish (owner only):

1. Create the npm org `synthwerk` on npmjs.com. The scope `@synthwerk` is free today.
2. `npm login` with an account in that org, with 2FA.

Publish (one step, from a clean `main`):

```bash
pnpm release   # pnpm check, then pnpm -r publish --access public
```

- `pnpm -r publish` skips a version that is already on npm. Bump `version` in the package first.
- Order: `tokens`, `sdk`, then `ui-vue`, `react`, `vue` (pnpm sorts the workspace).
- After the first publish: add npm trusted publishing (GitHub OIDC) per package and a `release` environment, then publish from CI with provenance. The fleet exception GOV-ENV-10 goes away then.
- Then synthwerk-widgets drops `vendor/` and uses the npm versions (synthwerk-sdk#18).
- Report a vulnerability through GitHub private vulnerability reporting on this repo.
