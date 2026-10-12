// Copies src/ui.css to dist/ui.css. The JS and .d.ts files come from `tsc -p tsconfig.build.json`.
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
mkdirSync(dist, { recursive: true })
copyFileSync(fileURLToPath(new URL('../src/ui.css', import.meta.url)), `${dist}ui.css`)
console.log(`dist/ui.css  ${statSync(`${dist}ui.css`).size} B`)
