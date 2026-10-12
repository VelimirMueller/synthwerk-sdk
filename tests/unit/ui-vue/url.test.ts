// @vitest-environment happy-dom
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { SwCard, safeHref } from '../../../packages/ui-vue/src/index.ts'

const BLOCKED = [
  'javascript:alert(1)',
  ' JaVaScRiPt:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  '\u0000javascript:alert(1)',
  '\u001Fjavascript:alert(1)',
  'javascript\u0000:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'vbscript:msgbox(1)',
  'java script:alert(1)',
  'file:///etc/passwd',
  ''
]

const ALLOWED: readonly (readonly [string, string])[] = [
  ['/vision', '/vision'],
  ['vision/labels', 'vision/labels'],
  ['../docs', '../docs'],
  ['?tab=1', '?tab=1'],
  ['#pricing', '#pricing'],
  ['https://synthwerk.dev', 'https://synthwerk.dev'],
  ['HTTP://example.com', 'HTTP://example.com'],
  ['mailto:hi@example.com', 'mailto:hi@example.com'],
  ['tel:+491234', 'tel:+491234'],
  [' https://example.com ', 'https://example.com'],
  ['/my docs/a b.html', '/my docs/a b.html'],
  ['https://exa\tmple.com', 'https://example.com']
]

describe('safeHref', () => {
  it.each(BLOCKED)('unsafe %j - check - undefined', (url) => {
    expect(safeHref(url)).toBeUndefined()
  })

  it.each(ALLOWED)('safe %j - check - %j', (url, out) => {
    expect(safeHref(url)).toBe(out)
  })

  it('null or undefined - check - undefined', () => {
    expect(safeHref(null)).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
  })
})

describe('SwCard href', () => {
  it.each(BLOCKED.filter(Boolean))('unsafe %j - render - article without href', (href) => {
    const w = mount(SwCard, { props: { href, title: 'x' } })
    expect(w.element.tagName).toBe('ARTICLE')
    expect(w.attributes('href')).toBeUndefined()
  })

  it.each(ALLOWED)('safe %j - render - link to %j', (href, out) => {
    const w = mount(SwCard, { props: { href, title: 'x' } })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe(out)
  })
})

describe('no raw HTML', () => {
  it('components - source - never set innerHTML', () => {
    const dir = join(fileURLToPath(import.meta.url), '../../../../packages/ui-vue/src/components')
    const files = readdirSync(dir)
    expect(files.length).toBe(7)
    for (const f of files) {
      expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(/innerHTML|v-html|outerHTML/)
    }
  })
})
