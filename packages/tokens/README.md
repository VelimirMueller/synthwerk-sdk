# @synthwerk/tokens

- Synthwerk design tokens: CSS custom properties, a Tailwind 4 theme, JSON and typed exports.
- Themes `default` (the public look, D-41) and `contrast` (AAA low vision), each in `light` and `dark`.
- Every text pair passes WCAG AA. `contrast` passes AAA.
- Use and rules: [docs/features/brand-tokens.md](../../docs/features/brand-tokens.md).

```css
@import "tailwindcss";
@import "@synthwerk/tokens/tokens.css";
@import "@synthwerk/tokens/tailwind.css";
```

```ts
import { contrastRatio, firstPaintScript, resolveColors, resolveMode } from '@synthwerk/tokens'
```
