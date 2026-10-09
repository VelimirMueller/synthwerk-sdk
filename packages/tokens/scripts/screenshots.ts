// Renders the demo page for every theme × mode and checks the theme rules in a real browser.
// Run after `pnpm build`: pnpm --filter @synthwerk/tokens screenshots [out-dir]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { resolveColors } from '../src/css.ts'
import { PREFS_KEY } from '../src/theme.ts'
import { type Mode, modes, type ThemeName, themeNames } from '../src/tokens.ts'
import { serve } from './serve.ts'

const outDir = resolve(process.argv[2] ?? 'screenshots')
mkdirSync(outDir, { recursive: true })

const { server, url } = await serve()
const browser = await chromium.launch()
let failures = 0

async function bgFor(
  prefs: Record<string, string> | null,
  colorScheme: 'light' | 'dark',
  shot?: string
): Promise<string> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme,
    deviceScaleFactor: 1
  })
  const page = await context.newPage()
  if (prefs) {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key as string, value as string),
      [PREFS_KEY, JSON.stringify(prefs)]
    )
  }
  await page.goto(`${url}demo/`)
  await page.waitForSelector('#primitives .swatch')
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  )
  if (shot) await page.screenshot({ path: shot, fullPage: true })
  await context.close()
  return bg
}

function expect(label: string, actual: string, expected: string): void {
  // Computed values of a var() chain come back as the declared hex.
  const ok = actual.toUpperCase() === expected.toUpperCase()
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: --bg ${actual} (expected ${expected})`)
}

const bg = (theme: ThemeName, mode: Mode): string => resolveColors(theme, mode).bg

for (const theme of themeNames) {
  for (const mode of modes) {
    const file = `${outDir}/tokens-${theme}-${mode}.png`
    // Stored choice wins over the OS: emulate the opposite OS scheme.
    const os = mode === 'dark' ? 'light' : 'dark'
    expect(
      `${theme} · stored ${mode} · OS ${os}`,
      await bgFor({ theme, mode }, os, file),
      bg(theme, mode)
    )
    console.log(`     ${file}`)
  }
}
// Nothing stored: default follows the OS, cyberpunk opens dark.
expect(
  'default · nothing stored · OS light',
  await bgFor({ theme: 'default' }, 'light'),
  bg('default', 'light')
)
expect(
  'default · nothing stored · OS dark',
  await bgFor({ theme: 'default' }, 'dark'),
  bg('default', 'dark')
)
expect('no prefs at all · OS dark', await bgFor(null, 'dark'), bg('default', 'dark'))
expect(
  'cyberpunk · nothing stored · OS light',
  await bgFor({ theme: 'cyberpunk' }, 'light'),
  bg('cyberpunk', 'dark')
)
expect(
  'cyberpunk · stored system · OS light',
  await bgFor({ theme: 'cyberpunk', mode: 'system' }, 'light'),
  bg('cyberpunk', 'light')
)
expect(
  'cyberpunk · stored system · OS dark',
  await bgFor({ theme: 'cyberpunk', mode: 'system' }, 'dark'),
  bg('cyberpunk', 'dark')
)

await browser.close()
server.close()
if (failures > 0) {
  console.error(`${failures} theme rule check(s) failed`)
  process.exit(1)
}
