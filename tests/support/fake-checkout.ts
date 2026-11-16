// A fake synthwerk-sdk checkout for create-synthwerk-app tests: packages/<folder> with a
// manifest and, when built, a dist folder.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const names: Record<string, string> = {
  sdk: '@synthwerk/sdk',
  react: '@synthwerk/react',
  vue: '@synthwerk/vue',
  tokens: '@synthwerk/tokens',
  'ui-vue': '@synthwerk/ui-vue'
}

export function fakeCheckout(root: string, built: boolean): string {
  for (const [folder, name] of Object.entries(names)) {
    mkdirSync(join(root, 'packages', folder, built ? 'dist' : ''), { recursive: true })
    writeFileSync(
      join(root, 'packages', folder, 'package.json'),
      JSON.stringify({ name, version: '1.2.3' })
    )
  }
  return root
}
