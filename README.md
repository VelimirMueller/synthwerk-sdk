<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/banner/hero-v2-light.svg">
  <img alt="SYNTHWERK-SDK. Design tokens now. Client and bindings next. npm packages for Synthwerk apps. Working." src="assets/banner/hero-v2-dark.svg" width="100%">
</picture>

<p align="center">

[![status: working](https://img.shields.io/badge/status-working-10b981?style=flat-square&labelColor=0a0a0b)](#-05-status) [![VM. flagship](https://img.shields.io/badge/VM.-flagship-6366f1?style=flat-square&labelColor=0a0a0b)](https://github.com/VelimirMueller) [![tokens 0.2.0](https://img.shields.io/badge/tokens-0.2.0-a1a1aa?style=flat-square&labelColor=0a0a0b)](packages/tokens) [![typescript](https://img.shields.io/badge/typescript-a1a1aa?style=flat-square&labelColor=0a0a0b)](#-04-usage)

</p>

> Design tokens now. Client and bindings next.

```text
 █████  ██  ██  ██  ██  ██████  ██  ██  ██   ██  ██████  █████   ██  ██
██      ██  ██  ███ ██    ██    ██  ██  ██   ██  ██      ██  ██  ██ ██
 ████    ████   ██████    ██    ██████  ██ █ ██  █████   █████   ████    █████
    ██    ██    ██ ███    ██    ██  ██  ███████  ██      ██ ██   ██ ██
█████     ██    ██  ██    ██    ██  ██   ██ ██   ██████  ██  ██  ██  ██
 █████  █████   ██  ██
██      ██  ██  ██ ██
 ████   ██  ██  ████
    ██  ██  ██  ██ ██
█████   █████   ██  ██  ██

 ------  npm packages for synthwerk apps  -----------------------
```

**synthwerk-sdk** holds the `@synthwerk/*` npm packages. Studio, widgets and SDK apps import them.
The first package is the design tokens. The rest is a plan. The plan is detailed.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/stats-v2-dark.svg">
  <img alt="1 PACKAGE WORKS. 6 PACKAGES PLANNED. 5 EXPORT PATHS. 3 COLOR MODES" src="assets/readme/stats-v2-light.svg" width="100%">
</picture>

<br>

## // 01 WHAT IT DOES

<img alt="01 WHAT IT DOES. DESIGN TOKENS. THE SDK FOLLOWS." src="assets/readme/divider-what-v2.svg" width="100%">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/features-v2-dark.svg">
  <img alt="TOKENS: The public look (D-41) as CSS variables, a Tailwind 4 theme, JSON and typed exports. v0.2.0. SDK: Core client generated from synthwerk-contracts. Auth modes, query keys. Not built yet. ADAPTERS: Vue 3.5 and React adapters plus pattern libraries. Planned" src="assets/readme/features-v2-light.svg" width="100%">
</picture>

- One pnpm workspace for the `@synthwerk/*` packages: SDK, framework adapters and design packages.
- `@synthwerk/tokens` is the public look (D-41) as CSS variables, a Tailwind 4 theme, JSON and typed exports.
- Run `pnpm install && pnpm check`. The repo calls no service at build time.
- Tokens work. The SDK, the adapters and the UI packages do not exist yet. Nothing is on npm yet.

<br>

## // 02 QUICK START

<img alt="02 QUICK START. COPY. PASTE. DONE." src="assets/readme/divider-start-v2.svg" width="100%">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/start-v2-dark.svg">
  <img alt="Terminal: $ corepack enable | $ pnpm install | $ pnpm check | # biome ci, tsc --noEmit, vitest run, build" src="assets/readme/start-v2-light.svg" width="100%">
</picture>

```bash
corepack enable
pnpm install
pnpm check      # biome ci, tsc --noEmit, vitest run, build
pnpm --filter @synthwerk/tokens demo         # demo page on http://127.0.0.1:4173/demo/
pnpm --filter @synthwerk/tokens screenshots  # theme checks in Chromium + PNGs in ./screenshots
```

In an app, import the CSS after Tailwind:

```css
@import "tailwindcss";
@import "@synthwerk/tokens/tokens.css";
@import "@synthwerk/tokens/tailwind.css";
```

<br>

## // 03 HOW IT WORKS

<img alt="03 HOW IT WORKS. ONE SOURCE. THREE OUTPUTS." src="assets/readme/divider-how-v2.svg" width="100%">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/flow-v2-dark.svg">
  <img alt="tokens.ts -> OUTPUTS -> APPS. themes default + contrast. modes light, dark, system." src="assets/readme/flow-v2-light.svg" width="100%">
</picture>

```text
  src/tokens.ts   one source: primitive > semantic > component > service
      |
      v
  +------------+      +--------------+      +-------------+
  | tokens.css |      | tailwind.css |      | tokens.json |
  | CSS vars   |      | Tailwind map |      | hex values  |
  +-----+------+      +------+-------+      +------+------+
        |                    |                     |
        +========+===========+===========+=========+
                         |
                   studio · widgets · SDK apps

  themes   default (website + dashboard look) · contrast (AAA)
  modes    light · dark · system (default: follow the OS)
```

- Ecosystem map: [synthwerk](https://github.com/VelimirMueller/synthwerk).

<br>

## // 04 USAGE

<img alt="04 USAGE. THE REFERENCE. CONDENSED." src="assets/readme/divider-usage-v2.svg" width="100%">

### Packages

- [`@synthwerk/tokens`](packages/tokens): exports `.` (typed data, `resolveMode`, `contrastRatio`, `firstPaintScript`), `./tokens.css`, `./tailwind.css`, `./tokens.json`, `./assets/*`. 0.2.0, not published.

### Configuration

- None. The repo ships npm packages, not a running service.

### API and events

- No HTTP API and no events. Service APIs live in [synthwerk-contracts](https://github.com/VelimirMueller/synthwerk-contracts).

### Development

- Lint and format: Biome 2.5 (D-06). Run `pnpm format` before a commit.
- TypeScript 6.0.3 for now. The SDK core moves to TS 7 when it starts.
- Node 24 runs the `.ts` scripts directly (type stripping). No `tsx` needed.
- Unit tests live in `tests/unit/`. Run `pnpm test`.
- Blueprint: [synthwerk-blueprint](https://github.com/VelimirMueller/synthwerk-blueprint).
- The full layout, fonts, logo and roadmap are in [docs/REFERENCE.md](docs/REFERENCE.md).

<br>

## // 05 STATUS

<img alt="05 STATUS. HONEST NUMBERS ONLY." src="assets/readme/divider-status-v2.svg" width="100%">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/status-v2-dark.svg">
  <img alt="@synthwerk/tokens: 0.2.0. tokens.css / tailwind.css / tokens.json: working. @synthwerk/sdk: not built. vue / react adapters: planned. npm publish: waiting on npm org" src="assets/readme/status-v2-light.svg" width="100%">
</picture>

```text
[ STATUS ]  in development, M0
[ WORKS  ]  @synthwerk/tokens 0.2.0
[ NEXT   ]  @synthwerk/sdk from contracts
```

Run the whole check:

```bash
pnpm check   # biome ci, tsc --noEmit, vitest run, build
```

- Feature doc: [Brand tokens](docs/features/brand-tokens.md) (beta). Changes: [CHANGELOG.md](CHANGELOG.md).

<br>

```text
-- EOF ------------------------------------------ TOKENS ARE NOT VIBES --
```

---

<sub>VM. studio / flagship · open source · look per <code>vm-brand</code> playbook · [MIT](LICENSE) © 2026 Velimir Mueller</sub>
