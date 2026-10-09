// Writes dist/tokens.css, dist/tailwind.css, dist/tokens.json and dist/first-paint.js from src/tokens.ts.
// The JS and .d.ts files come from `tsc -p tsconfig.build.json` (see package.json).
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderTailwindCss, renderTokensCss, renderTokensJson } from '../src/css.ts'
import { firstPaintScript } from '../src/theme.ts'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
mkdirSync(dist, { recursive: true })

const files = {
  'tokens.css': renderTokensCss(),
  'tailwind.css': renderTailwindCss(),
  'tokens.json': renderTokensJson(),
  'first-paint.js': `${firstPaintScript}\n`
}
for (const [name, content] of Object.entries(files)) {
  writeFileSync(dist + name, content)
  console.log(`dist/${name}  ${Buffer.byteLength(content)} B`)
}
