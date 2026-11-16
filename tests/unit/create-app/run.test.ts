import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseFlags } from '../../../packages/create-synthwerk-app/src/args.ts'
import {
  type RunIo,
  resolve,
  run,
  version
} from '../../../packages/create-synthwerk-app/src/run.ts'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function io(answers: string[] | null = null) {
  const cwd = mkdtempSync(join(tmpdir(), 'csa-run-'))
  dirs.push(cwd)
  const out: string[] = []
  const err: string[] = []
  const execs: [string, readonly string[], string][] = []
  const value: RunIo = {
    cwd,
    log: (line) => out.push(line),
    error: (line) => err.push(line),
    ask: answers ? async (_q, fallback) => answers.shift() ?? fallback : null,
    exec: (cmd, args, dir) => {
      execs.push([cmd, args, dir])
    }
  }
  return { io: value, out, err, execs, cwd }
}

describe('create-synthwerk-app run', () => {
  it('no terminal, no flags - react in ./synthwerk-app, npm note', async () => {
    const t = io()
    expect(await run([], t.io)).toBe(0)
    expect(existsSync(join(t.cwd, 'synthwerk-app', 'src', 'App.tsx'))).toBe(true)
    expect(t.out.join('\n')).toContain('not on npm yet')
    expect(t.execs).toEqual([])
  })

  it('--template vue --local --install - packs from this checkout, then installs', async () => {
    const t = io()
    expect(await run(['app', '-t', 'vue', '--local', '--install'], t.io)).toBe(0)
    const app = join(t.cwd, 'app')
    expect(existsSync(join(app, 'src', 'App.vue'))).toBe(true)
    expect(t.execs.filter(([, args]) => args[0] === 'pack')).toHaveLength(4)
    expect(t.execs.at(-1)).toEqual(['pnpm', ['install'], app])
    expect(readFileSync(join(app, 'pnpm-workspace.yaml'), 'utf8')).toContain('@synthwerk/ui-vue')
  })

  it('terminal - asks for dir and template, repeats a bad template answer', async () => {
    const t = io(['chat', 'svelte', 'vue'])
    expect(await run([], t.io)).toBe(0)
    expect(readdirSync(join(t.cwd, 'chat', 'src'))).toContain('App.vue')
  })

  it('--yes - asks nothing even in a terminal', async () => {
    const parsed = parseFlags(['--yes'])
    if (parsed.kind !== 'run') throw new Error('expected run')
    expect(await resolve(parsed.flags, async () => 'vue')).toEqual({
      dir: 'synthwerk-app',
      template: 'react'
    })
  })

  it('bad flags exit 2; a scaffold error exits 1; help and version exit 0', async () => {
    const t = io()
    expect(await run(['-t', 'angular'], t.io)).toBe(2)
    expect(t.err[0]).toMatch(/Unknown template/)
    await run(['x'], t.io)
    expect(await run(['x'], t.io)).toBe(1)
    expect(t.err.at(-1)).toMatch(/not empty/)
    expect(await run(['--help'], t.io)).toBe(0)
    expect(await run(['--version'], t.io)).toBe(0)
    expect(t.out).toContain(version)
  })
})
