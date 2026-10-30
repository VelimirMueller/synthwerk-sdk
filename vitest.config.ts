import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // The adapters import the core by name; tests run on its source, not on dist.
    alias: {
      '@synthwerk/sdk': fileURLToPath(new URL('./packages/sdk/src/index.ts', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Fleet floor (CI-UNIT-02, CI-UNIT-03).
      thresholds: { lines: 80, branches: 70 }
    }
  }
})
