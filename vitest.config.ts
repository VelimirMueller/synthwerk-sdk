import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Fleet floor (CI-UNIT-02, CI-UNIT-03).
      thresholds: { lines: 80, branches: 70 }
    }
  }
})
