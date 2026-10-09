import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'
import {
  renderTailwindCss,
  renderTokensCss,
  renderTokensJson,
  selectors
} from '../../../packages/tokens/src/css.ts'
import {
  components,
  defaultGroup,
  groupColorNames,
  groupNames,
  groups,
  modes,
  motion,
  semanticColorNames,
  semanticEffectNames,
  serviceNames,
  themeNames
} from '../../../packages/tokens/src/tokens.ts'

const css = renderTokensCss()

interface Rule {
  readonly selector: string
  readonly media: string | null
  readonly decls: ReadonlyMap<string, string>
}

/** Small parser for the generated file: rules with declarations, one level of @media. */
function parse(source: string): Rule[] {
  const rules: Rule[] = []
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const walk = (chunk: string, media: string | null) => {
    let i = 0
    while (i < chunk.length) {
      const open = chunk.indexOf('{', i)
      if (open < 0) break
      const head = chunk.slice(i, open).trim()
      let depth = 1
      let j = open + 1
      while (depth > 0 && j < chunk.length) {
        if (chunk[j] === '{') depth++
        else if (chunk[j] === '}') depth--
        j++
      }
      const body = chunk.slice(open + 1, j - 1)
      if (head.startsWith('@media')) {
        walk(body, head)
      } else {
        const decls = new Map<string, string>()
        for (const line of body.split(';')) {
          const at = line.indexOf(':')
          if (at > 0) decls.set(line.slice(0, at).trim(), line.slice(at + 1).trim())
        }
        rules.push({ selector: head, media, decls })
      }
      i = j
    }
  }
  walk(text, null)
  return rules
}

const rules = parse(css)
const findRule = (selector: string, media: string | null = null) => {
  const rule = rules.find((r) => r.selector === selector && r.media === media)
  if (!rule) throw new Error(`No rule "${selector}" in ${media ?? 'top level'}`)
  return rule
}
const DARK_MEDIA = '@media (prefers-color-scheme: dark)'

/** Every property a theme × mode block must declare. */
const groupColors = new Set<string>(groupColorNames)
const requiredInEveryBlock = [
  ...semanticColorNames.filter((n) => !groupColors.has(n)).map((n) => `--${n}`),
  ...groupNames.flatMap((g) => [`--group-${g}-accent`, `--group-${g}-fg`]),
  ...semanticEffectNames.map((n) => `--${n}`),
  ...serviceNames.map((s) => `--service-${s}-text`),
  'color-scheme'
]

describe('tokens.css structure', () => {
  const blocks = themeNames.flatMap((theme) => [
    [`${theme} · light`, findRule(selectors[theme].light), 'light'] as const,
    [`${theme} · dark (stored)`, findRule(selectors[theme].dark), 'dark'] as const,
    [`${theme} · dark (OS)`, findRule(selectors[theme].systemDark, DARK_MEDIA), 'dark'] as const
  ])

  it.each(blocks)('%s block - every semantic token - declared', (_label, rule, mode) => {
    const missing = requiredInEveryBlock.filter((p) => !rule.decls.has(p))
    expect(missing).toEqual([])
    expect(rule.decls.get('color-scheme')).toBe(mode)
  })

  it('stored and OS dark blocks - same theme - identical declarations', () => {
    for (const theme of themeNames) {
      const stored = findRule(selectors[theme].dark)
      const os = findRule(selectors[theme].systemDark, DARK_MEDIA)
      expect([...os.decls]).toEqual([...stored.decls])
    }
  })

  it('every var() reference - whole file - points to a defined custom property', () => {
    const defined = new Set(rules.flatMap((r) => [...r.decls.keys()]))
    const used = new Set([...css.matchAll(/var\(--([\w-]+)\)/g)].map((m) => `--${m[1]}`))
    const dangling = [...used].filter((name) => !defined.has(name))
    expect(dangling).toEqual([])
  })

  it('every declaration - whole file - is not a self-reference cycle', () => {
    const cycles = rules.flatMap((r) =>
      [...r.decls].filter(([name, value]) => value === `var(${name})`).map(([n]) => n)
    )
    expect(cycles).toEqual([])
  })

  it('component tokens - scope rule - declared on every theme scope', () => {
    const scope = findRule(':root, [data-theme], [data-group], [data-service]')
    expect([...scope.decls.keys()]).toEqual(Object.keys(components).map((n) => `--${n}`))
  })

  it.each(blocks)(
    '%s block - group colours - never declared (the group layer owns them)',
    (_l, rule) => {
      for (const name of groupColorNames) expect(rule.decls.has(`--${name}`)).toBe(false)
    }
  )

  it('group default rule - zero specificity - uses the default group', () => {
    const rule = findRule(':where(:root, [data-theme], [data-group])')
    expect(rule.decls.get('--accent-2')).toBe(`var(--group-${defaultGroup}-accent)`)
    expect(rule.decls.get('--ring')).toBe(`var(--group-${defaultGroup}-accent)`)
  })

  it.each(groupNames)('group %s - rule - sets accent-2, ring, fg and fill', (group) => {
    const rule = findRule(
      `[data-group="${group}"], [data-group="${group}"] [data-theme]:not([data-group])`
    )
    const accent = `var(--group-${group}-accent)`
    expect(rule.decls.get('--accent-2')).toBe(accent)
    expect(rule.decls.get('--accent-2-text')).toBe(accent)
    expect(rule.decls.get('--ring')).toBe(accent)
    expect(rule.decls.get('--accent-2-fg')).toBe(`var(--group-${group}-fg)`)
    expect(rule.decls.get('--group-fill')).toBe(`var(--${groups[group].fill})`)
  })

  it.each(serviceNames)('service %s - rule - sets accent and mode-aware text', (service) => {
    const rule = findRule(`[data-service="${service}"]`)
    expect(rule.decls.get('--service-accent-text')).toBe(`var(--service-${service}-text)`)
    expect(rule.decls.get('--service-accent')).toMatch(/^var\(--[a-z]+-400\)$/)
  })

  it('reduced motion - media block - sets every duration to 0.01ms', () => {
    const root = findRule(':root', '@media (prefers-reduced-motion: reduce)')
    for (const name of Object.keys(motion.duration)) {
      expect(root.decls.get(`--duration-${name}`)).toBe('0.01ms')
    }
    const all = findRule('*, *::before, *::after', '@media (prefers-reduced-motion: reduce)')
    expect(all.decls.get('transition-duration')).toBe('0.01ms !important')
  })

  it('contrast selectors - nothing stored - follow the OS like default', () => {
    expect(selectors.contrast.dark).toBe('[data-theme="contrast"][data-mode="dark"]')
    expect(selectors.contrast.systemDark).toBe('[data-theme="contrast"]:not([data-mode="light"])')
  })

  it('OS dark selectors - stored light - excluded (stored choice wins)', () => {
    expect(selectors.default.systemDark).toContain(':not([data-mode="light"])')
    expect(selectors.contrast.systemDark).toContain(':not([data-mode="light"])')
  })

  it('default selectors - contrast on :root - never match', () => {
    expect(selectors.default.dark).toContain(':root:not([data-theme="contrast"])')
    expect(selectors.default.systemDark).toContain(':root:not([data-theme="contrast"])')
  })

  it('texture grid - default theme - draws horizontal and vertical lines', () => {
    const grid = findRule(selectors.default.light).decls.get('--texture-grid') ?? ''
    expect(grid).toContain('linear-gradient(90deg,')
    expect(grid.match(/linear-gradient\(/g)).toHaveLength(2)
  })

  it('old cyberpunk theme - whole file - gone', () => {
    expect(css).not.toMatch(/cyberpunk|neon/)
  })
})

describe('tailwind.css', () => {
  const require = createRequire(import.meta.url)
  const twIndex = require.resolve('tailwindcss/index.css')

  async function build(candidates: string[]): Promise<string> {
    const input = `@import "tailwindcss";\n${renderTailwindCss()}`
    const compiler = await compile(input, {
      base: process.cwd(),
      loadStylesheet: async (id: string) => {
        if (id !== 'tailwindcss') throw new Error(`Unexpected import ${id}`)
        return { path: twIndex, base: dirname(twIndex), content: await readFile(twIndex, 'utf8') }
      }
    })
    return compiler.build(candidates)
  }

  it('Tailwind 4 compile - token utilities - map to the runtime variables', async () => {
    const out = await build([
      'bg-surface',
      'text-fg-muted',
      'ring-ring',
      'bg-service',
      'font-display',
      'rounded-card',
      'shadow-card',
      'ease-standard',
      'text-5xl',
      'dark:bg-accent'
    ])
    expect(out).toMatch(/\.bg-surface\s*\{\s*background-color:\s*var\(--surface\)/)
    expect(out).toMatch(/\.text-fg-muted\s*\{\s*color:\s*var\(--fg-muted\)/)
    expect(out).toMatch(/\.bg-service\s*\{\s*background-color:\s*var\(--service-accent\)/)
    expect(out).toMatch(/\.rounded-card\s*\{\s*border-radius:\s*1\.5rem/)
    expect(out).toContain('var(--motion-ease-standard)')
    expect(out).toContain('"Space Mono"')
    expect(out).toContain('letter-spacing: var(--tw-tracking, -0.04em)')
    expect(out).toContain('[data-mode="dark"]')
    expect(out).toContain('prefers-color-scheme: dark')
  })

  it('Tailwind @theme - every semantic colour - has a color utility', () => {
    const tw = renderTailwindCss()
    for (const name of semanticColorNames) expect(tw).toContain(`--color-${name}: var(--${name});`)
  })
})

describe('tokens.json', () => {
  const json = JSON.parse(renderTokensJson())

  it('themes - every theme × mode - every semantic colour resolved to hex', () => {
    for (const theme of themeNames) {
      for (const mode of modes) {
        for (const name of semanticColorNames) {
          expect(json.themes[theme][mode].colors[name]).toMatch(/^#[0-9A-F]{6}$/)
        }
      }
    }
  })

  it('defaultMode - both themes - follow the system', () => {
    expect(json.defaultMode).toEqual({ default: 'system', contrast: 'system' })
  })
})

describe('size budget', () => {
  it('tokens.css - gzip - at most 8 KB (synthwerk-sdk §7)', async () => {
    const { gzipSync } = await import('node:zlib')
    expect(gzipSync(css).byteLength).toBeLessThanOrEqual(8 * 1024)
  })
})
