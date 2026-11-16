#!/usr/bin/env node
// Entry of `create-synthwerk-app` (`pnpm create synthwerk-app`). The flow is in run.ts.
// The `.ts` import is right: tsconfig.base.json sets `rewriteRelativeImportExtensions`, so
// tsc emits `./run.js` in dist/cli.js. CI runs dist/cli.js in check:templates.
import { processIo, run } from './run.ts'

process.exitCode = await run(process.argv.slice(2), processIo())
