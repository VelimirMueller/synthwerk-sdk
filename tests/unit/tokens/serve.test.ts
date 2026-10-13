import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { serve } from '../../../packages/tokens/scripts/serve.ts'

const script = fileURLToPath(new URL('../../../packages/tokens/scripts/serve.ts', import.meta.url))

/** Sends a raw request path (no client-side normalisation) and returns the status code. */
const status = (url: string, path: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const { hostname, port } = new URL(url)
    request({ hostname, port, path }, (res) => {
      res.resume()
      resolve(res.statusCode ?? 0)
    })
      .on('error', reject)
      .end()
  })

describe('demo server', () => {
  const started = serve(0)
  afterAll(async () => (await started).server.close())

  it('malformed URL - /%E0 - answers 400 and the server keeps running', async () => {
    const { url } = await started
    expect(await status(url, '/%E0')).toBe(400)
    expect(await status(url, '/package.json')).toBe(200)
  })

  it('main-module check - script in a path with a space and a non-ASCII letter - starts', async () => {
    // tmpdir() is behind a symlink on macOS (/var -> /private/var), so this also covers symlinks.
    const base = mkdtempSync(join(tmpdir(), 'synthwerk serve ä-'))
    try {
      mkdirSync(join(base, 'scripts'))
      const copy = join(base, 'scripts', 'serve.ts')
      copyFileSync(script, copy)
      const child = spawn(process.execPath, [copy], { env: { ...process.env, PORT: '0' } })
      const line = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('server did not start')), 10_000)
        child.stdout.on('data', (chunk: Buffer) => {
          clearTimeout(timer)
          resolve(chunk.toString())
        })
        child.on('exit', (code) => {
          clearTimeout(timer)
          reject(new Error(`script exited with ${code} before it started the server`))
        })
      })
      child.kill()
      expect(line).toMatch(/^demo: http:\/\/127\.0\.0\.1:\d+\/demo\//)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})
