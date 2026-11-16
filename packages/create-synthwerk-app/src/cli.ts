#!/usr/bin/env node
// Entry of `create-synthwerk-app` (`pnpm create synthwerk-app`). The flow is in run.ts.
import { processIo, run } from './run.ts'

process.exitCode = await run(process.argv.slice(2), processIo())
