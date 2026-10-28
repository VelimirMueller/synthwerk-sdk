import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  contractsDir,
  generate,
  generatedDir,
  outputName,
  readLock,
  sha256
} from '../../../packages/sdk/scripts/codegen.ts'

const lock = readLock()

describe('codegen', () => {
  it('contracts lock - pinned commit - full 40-char SHA', () => {
    expect(lock.commit).toMatch(/^[0-9a-f]{40}$/)
  })

  for (const specFile of Object.keys(lock.files)) {
    it(`contracts/${specFile} - vendored spec - matches its sha256 in the lock`, () => {
      const text = readFileSync(join(contractsDir, specFile), 'utf8')
      expect(sha256(text)).toBe(lock.files[specFile]?.sha256)
    })

    it(`src/generated/${outputName(specFile)} - regenerated - no drift (run pnpm --filter @synthwerk/sdk codegen)`, async () => {
      const onDisk = readFileSync(join(generatedDir, outputName(specFile)), 'utf8')
      expect(onDisk).toBe(await generate(specFile, lock))
    })
  }
})
