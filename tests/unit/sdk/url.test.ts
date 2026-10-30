import { describe, expect, it } from 'vitest'
import { trimSlash } from '../../../packages/sdk/src/client/url.ts'

describe('trimSlash', () => {
  it.each([
    ['https://api.test', 'https://api.test'],
    ['https://api.test/', 'https://api.test'],
    ['https://api.test///', 'https://api.test'],
    ['https://api.test/a/', 'https://api.test/a'],
    ['///', ''],
    ['', '']
  ])('%j - trailing slashes removed', (input, expected) => {
    expect(trimSlash(input)).toBe(expected)
  })

  it('100 000 slashes then a letter - linear time, nothing removed', () => {
    const input = `${'/'.repeat(100_000)}a`
    const started = performance.now()
    expect(trimSlash(input)).toBe(input)
    expect(performance.now() - started).toBeLessThan(500)
  })
})
