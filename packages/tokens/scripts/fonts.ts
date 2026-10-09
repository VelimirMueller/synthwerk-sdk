// Pinned font files (SIL OFL 1.1) from the official google/fonts repo, cached in .cache/fonts/.
//
// - Used by outline-wordmark.ts (Space Mono Bold) and by the demo page (all faces).
// - Every file is pinned by commit and SHA-256. A cached file with a wrong hash is fetched again once.
// - .cache/ is git-ignored. The package ships no font binary; apps self-host the fonts.
//
// Run: pnpm --filter @synthwerk/tokens fonts   (needs network on the first run)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const pins = {
  spacemono: {
    commit: '8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5',
    files: {
      'SpaceMono-Regular.ttf': '95837e182baeeada83368f7748db28357f0a1b75c6b84ff7065b5edf933c8e18',
      'SpaceMono-Bold.ttf': '405e73d41afb7e5906efce206a326af5c956f38e255f35421c260e861e599c59',
      'OFL.txt': '8e4ee42b2553e1e01504e61cb0d46d148cd8c9e5eacaa3622a7df2d4f2955b9f'
    }
  },
  inter: {
    commit: '0b58fb370093f9a9f4ff785d94405710b79de67c',
    files: {
      'Inter[opsz,wght].ttf': '29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031',
      'OFL.txt': '5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57'
    }
  },
  jetbrainsmono: {
    commit: '6e4b84c976cadb3c49a40fd9a1c203e4f7fcf2da',
    files: {
      'JetBrainsMono[wght].ttf': '48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda',
      'OFL.txt': 'b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d'
    }
  }
} as const

export type Family = keyof typeof pins

const cacheRoot = fileURLToPath(new URL('../.cache/fonts/', import.meta.url))
const sha256 = (data: Buffer): string => createHash('sha256').update(data).digest('hex')

/** Returns the pinned file of a family, from the cache or from google/fonts. */
export async function fetchPinned<F extends Family>(
  family: F,
  name: keyof (typeof pins)[F]['files'] & string
): Promise<Buffer> {
  const pin = pins[family]
  const expected = (pin.files as Record<string, string>)[name]
  const dir = `${cacheRoot}${family}/`
  const path = dir + name
  if (existsSync(path)) {
    const cached = readFileSync(path)
    if (sha256(cached) === expected) return cached
    rmSync(path)
  }
  const url = `https://raw.githubusercontent.com/google/fonts/${pin.commit}/ofl/${family}/${encodeURIComponent(name)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download of ${family}/${name} failed: HTTP ${res.status}`)
  const data = Buffer.from(await res.arrayBuffer())
  const sha = sha256(data)
  if (sha !== expected) throw new Error(`${family}/${name}: SHA-256 ${sha} does not match the pin`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, data)
  return data
}

/** Fetches every pinned file. */
export async function fetchAll(): Promise<void> {
  for (const family of Object.keys(pins) as Family[]) {
    for (const name of Object.keys(pins[family].files)) {
      await fetchPinned(family, name as never)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await fetchAll()
  console.log(`fonts cached in ${cacheRoot}`)
}
