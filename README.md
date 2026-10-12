<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/banner/hero-v2-light.svg">
  <img alt="SYNTHWERK-SDK. Design tokens now. Client and bindings next. npm packages for Synthwerk apps. Working." src="assets/banner/hero-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/lead-v2-light.svg">
  <img alt="synthwerk-sdk holds the @synthwerk/* npm packages. Studio, widgets and SDK apps import them. The first package is the design tokens. The rest is a plan. The plan is detailed." src="assets/readme/lead-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/stats-v2-light.svg">
  <img alt="1 PACKAGE WORKS. 6 PACKAGES PLANNED. 5 EXPORT PATHS. 3 COLOR MODES" src="assets/readme/stats-v2-dark.svg" width="100%">
</picture>
</p>

<br>

<p>
<img alt="01 WHAT IT DOES. DESIGN TOKENS. THE SDK FOLLOWS." src="assets/readme/divider-what-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/features-v2-light.svg">
  <img alt="TOKENS: The public look (D-41) as CSS variables, a Tailwind 4 theme, JSON and typed exports. v0.2.0. SDK: Core client generated from synthwerk-contracts. Auth modes, query keys. Not built yet. ADAPTERS: Vue 3.5 and React adapters plus pattern libraries. Planned" src="assets/readme/features-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/what-v2-light.svg">
  <img alt="One pnpm workspace: For the @synthwerk/* packages: SDK, framework adapters and design packages. TypeScript. @synthwerk/tokens: The public look (D-41) as CSS variables, a Tailwind 4 theme, JSON and typed exports. No service at build time: Run pnpm install &amp;&amp; pnpm check. The repo calls no service at build time. Tokens work: The SDK, the adapters and the UI packages do not exist yet. Nothing is on npm yet" src="assets/readme/what-v2-dark.svg" width="100%">
</picture>
</p>

<br>

<p>
<img alt="02 QUICK START. COPY. PASTE. DONE." src="assets/readme/divider-start-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/start-v2-light.svg">
  <img alt="Terminal: $ corepack enable | $ pnpm install | $ pnpm check | # biome ci, tsc --noEmit, vitest run, build" src="assets/readme/start-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/demo-v2-light.svg">
  <img alt="pnpm --filter @synthwerk/tokens demo: Demo page on http://127.0.0.1:4173/demo/. pnpm --filter @synthwerk/tokens screenshots: Theme checks in Chromium + PNGs in ./screenshots" src="assets/readme/demo-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/import-v2-light.svg">
  <img alt="Terminal: @import &quot;tailwindcss&quot;; | @import &quot;@synthwerk/tokens/tokens.css&quot;; | @import &quot;@synthwerk/tokens/tailwind.css&quot;;" src="assets/readme/import-v2-dark.svg" width="100%">
</picture>
</p>

<details>
<summary><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-9-v2-light.svg"><img alt="Plain text" src="assets/readme/links-9-v2-dark.svg" width="32%"></picture></summary>

```bash
corepack enable
pnpm install
pnpm check      # biome ci, tsc --noEmit, vitest run, build
pnpm --filter @synthwerk/tokens demo         # demo page on http://127.0.0.1:4173/demo/
pnpm --filter @synthwerk/tokens screenshots  # theme checks in Chromium + PNGs in ./screenshots
```

```css
@import "tailwindcss";
@import "@synthwerk/tokens/tokens.css";
@import "@synthwerk/tokens/tailwind.css";
```

</details>

<br>

<p>
<img alt="03 HOW IT WORKS. ONE SOURCE. THREE OUTPUTS." src="assets/readme/divider-how-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/flow-v2-light.svg">
  <img alt="tokens.ts -&gt; OUTPUTS -&gt; APPS. themes default + contrast. modes light, dark, system." src="assets/readme/flow-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/outputs-v2-light.svg">
  <img alt="src/tokens.ts: One source in four layers: primitive &gt; semantic &gt; component &gt; service. tokens.css: CSS vars. tailwind.css: Tailwind map. tokens.json: Hex values. consumers: Studio, widgets and SDK apps read all three. themes: default (website + dashboard look) and contrast (AAA). modes: light, dark and system. Default: follow the OS" src="assets/readme/outputs-v2-dark.svg" width="100%">
</picture>
</p>

<p align="center">
<a href="https://github.com/VelimirMueller/synthwerk"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-1-v2-light.svg"><img alt="Ecosystem map (https://github.com/VelimirMueller/synthwerk)" src="assets/readme/links-1-v2-dark.svg" width="32%"></picture></a>
<a href="docs/REFERENCE.md"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-2-v2-light.svg"><img alt="Reference (docs/REFERENCE.md)" src="assets/readme/links-2-v2-dark.svg" width="32%"></picture></a>
</p>

<br>

<p>
<img alt="04 USAGE. THE REFERENCE. CONDENSED." src="assets/readme/divider-usage-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/packages-v2-light.svg">
  <img alt="@synthwerk/tokens: In packages/tokens. Exports . (typed data, resolveMode, contrastRatio, firstPaintScript), ./tokens.css, ./tailwind.css, ./tokens.json, ./assets/*. 0.2.0, not published. configuration: None. The repo ships npm packages, not a running service. API and events: No HTTP API and no events. Service APIs live in synthwerk-contracts (https://github.com/VelimirMueller/synthwerk-contracts)" src="assets/readme/packages-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/dev-v2-light.svg">
  <img alt="Lint and format: Biome 2.5 (D-06). Run pnpm format before a commit. TypeScript 6.0.3 for now: The SDK core moves to TS 7 when it starts. Node 24: Runs the .ts scripts directly (type stripping). No tsx needed. Unit tests: Live in tests/unit/. Run pnpm test. Blueprint: Shared CI and templates: synthwerk-blueprint (https://github.com/VelimirMueller/synthwerk-blueprint). Reference: The full layout, fonts, logo and roadmap are in docs/REFERENCE.md" src="assets/readme/dev-v2-dark.svg" width="100%">
</picture>
</p>

<p align="center">
<a href="packages/tokens"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-3-v2-light.svg"><img alt="@synthwerk/tokens (packages/tokens)" src="assets/readme/links-3-v2-dark.svg" width="32%"></picture></a>
<a href="https://github.com/VelimirMueller/synthwerk-contracts"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-4-v2-light.svg"><img alt="synthwerk-contracts (https://github.com/VelimirMueller/synthwerk-contracts)" src="assets/readme/links-4-v2-dark.svg" width="32%"></picture></a>
<a href="https://github.com/VelimirMueller/synthwerk-blueprint"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-5-v2-light.svg"><img alt="synthwerk-blueprint (https://github.com/VelimirMueller/synthwerk-blueprint)" src="assets/readme/links-5-v2-dark.svg" width="32%"></picture></a>
</p>

<br>

<p>
<img alt="05 STATUS. HONEST NUMBERS ONLY." src="assets/readme/divider-status-v2.svg" width="100%">
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/status-v2-light.svg">
  <img alt="@synthwerk/tokens: 0.2.0. tokens.css / tailwind.css / tokens.json: working. @synthwerk/sdk: not built. vue / react adapters: planned. npm publish: waiting on npm org" src="assets/readme/status-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/now-v2-light.svg">
  <img alt="M0 STATUS: IN DEVELOPMENT. 0.2.0 WORKS: @SYNTHWERK/TOKENS. SDK NEXT: @SYNTHWERK/SDK FROM CONTRACTS" src="assets/readme/now-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/check-v2-light.svg">
  <img alt="Terminal: $ pnpm check | # biome ci, tsc --noEmit, vitest run, build" src="assets/readme/check-v2-dark.svg" width="100%">
</picture>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/docs-v2-light.svg">
  <img alt="Feature doc: Brand tokens (docs/features/brand-tokens.md), beta. Changes: The change log is CHANGELOG.md" src="assets/readme/docs-v2-dark.svg" width="100%">
</picture>
</p>

<p align="center">
<a href="docs/features/brand-tokens.md"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-6-v2-light.svg"><img alt="Brand tokens (docs/features/brand-tokens.md)" src="assets/readme/links-6-v2-dark.svg" width="32%"></picture></a>
<a href="CHANGELOG.md"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-7-v2-light.svg"><img alt="Changelog (CHANGELOG.md)" src="assets/readme/links-7-v2-dark.svg" width="32%"></picture></a>
<a href="LICENSE"><picture><source media="(prefers-color-scheme: light)" srcset="assets/readme/links-8-v2-light.svg"><img alt="License (LICENSE)" src="assets/readme/links-8-v2-dark.svg" width="32%"></picture></a>
</p>

<p>
<picture>
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/footer-v2-light.svg">
  <img alt="VM. studio / flagship · open source · look per vm-brand playbook · MIT (c) 2026 Velimir Mueller · -- EOF -- tokens are not vibes --" src="assets/readme/footer-v2-dark.svg" width="100%">
</picture>
</p>
