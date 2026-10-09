import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { firstPaintScript, PREFS_KEY, resolveMode } from '../../../packages/tokens/src/theme.ts'

describe('resolveMode', () => {
  it.each([
    ['default', undefined, false, 'light'],
    ['default', undefined, true, 'dark'],
    ['cyberpunk', undefined, false, 'dark'],
    ['cyberpunk', undefined, true, 'dark'],
    ['cyberpunk', 'system', false, 'light'],
    ['cyberpunk', 'system', true, 'dark'],
    ['default', 'system', true, 'dark'],
    ['cyberpunk', 'light', true, 'light'],
    ['default', 'dark', false, 'dark'],
    ['default', 'light', true, 'light']
  ] as const)('resolveMode - %s, stored %s, OS dark %s - %s', (theme, stored, os, expected) => {
    expect(resolveMode(theme, stored, os)).toBe(expected)
  })
})

describe('firstPaintScript', () => {
  function run(stored: string | null) {
    const attrs = new Map<string, string>()
    const documentElement = { setAttribute: (k: string, v: string) => attrs.set(k, v) }
    const localStorage = { getItem: (k: string) => (k === PREFS_KEY ? stored : null) }
    runInNewContext(firstPaintScript, { document: { documentElement }, localStorage, JSON })
    return Object.fromEntries(attrs)
  }

  it('firstPaintScript - stored theme and mode - copied to html attributes', () => {
    expect(run(JSON.stringify({ theme: 'cyberpunk', mode: 'light' }))).toEqual({
      'data-theme': 'cyberpunk',
      'data-mode': 'light'
    })
  })

  it('firstPaintScript - nothing stored - sets no attribute', () => {
    expect(run(null)).toEqual({})
  })

  it('firstPaintScript - unknown values or broken JSON - ignored without error', () => {
    expect(run(JSON.stringify({ theme: 'neon', mode: 'dim' }))).toEqual({})
    expect(run('{not json')).toEqual({})
  })

  it('demo page - head - loads the first-paint script before the stylesheet', () => {
    const html = readFileSync(
      new URL('../../../packages/tokens/demo/index.html', import.meta.url),
      'utf8'
    )
    const script = html.indexOf('<script src="../dist/first-paint.js"></script>')
    expect(script).toBeGreaterThan(0)
    expect(script).toBeLessThan(html.indexOf('../dist/tokens.css'))
  })
})
