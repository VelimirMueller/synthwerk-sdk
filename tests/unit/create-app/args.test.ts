import { describe, expect, it } from 'vitest'
import { isHttpUrl, parseFlags } from '../../../packages/create-synthwerk-app/src/args.ts'

describe('create-synthwerk-app flags', () => {
  it('no flags - nothing set, react is not forced (asked or default later)', () => {
    expect(parseFlags([])).toEqual({
      kind: 'run',
      flags: {
        dir: undefined,
        template: undefined,
        apiUrl: undefined,
        authUrl: undefined,
        clientId: undefined,
        projectId: undefined,
        local: false,
        sdkDir: undefined,
        install: false,
        yes: false
      }
    })
  })

  it('--template vue and the env values - all read', () => {
    const parsed = parseFlags([
      'my-app',
      '-t',
      'vue',
      '--api-url',
      'https://api.test',
      '--auth-url',
      'https://auth.test',
      '--client-id',
      'client-1',
      '--project-id',
      '42',
      '--local',
      '--sdk-dir',
      '../sdk',
      '--install',
      '-y'
    ])
    expect(parsed).toEqual({
      kind: 'run',
      flags: {
        dir: 'my-app',
        template: 'vue',
        apiUrl: 'https://api.test',
        authUrl: 'https://auth.test',
        clientId: 'client-1',
        projectId: '42',
        local: true,
        sdkDir: '../sdk',
        install: true,
        yes: true
      }
    })
  })

  it('unknown template, two dirs, --sdk-dir without --local, bad URL or id - error', () => {
    expect(parseFlags(['-t', 'svelte'])).toMatchObject({ kind: 'error' })
    expect(parseFlags(['a', 'b'])).toMatchObject({ kind: 'error' })
    expect(parseFlags(['--sdk-dir', 'x'])).toMatchObject({ kind: 'error' })
    expect(parseFlags(['--api-url', 'ftp://x'])).toMatchObject({ kind: 'error' })
    expect(parseFlags(['--client-id', 'a\nB=1'])).toMatchObject({ kind: 'error' })
    expect(parseFlags(['--nope'])).toMatchObject({ kind: 'error' })
  })

  it('help and version - their own kinds', () => {
    expect(parseFlags(['--help'])).toEqual({ kind: 'help' })
    expect(parseFlags(['-v'])).toEqual({ kind: 'version' })
  })

  it('isHttpUrl - http(s) only, no whitespace', () => {
    expect(isHttpUrl('http://localhost:8080')).toBe(true)
    expect(isHttpUrl('https://a.test/x y')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
  })
})
