// Static file server for the demo page. Run: pnpm --filter @synthwerk/tokens demo
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
}

/** Serves the package folder on 127.0.0.1. Port 0 picks a free port. */
export function serve(port = 0): Promise<{ server: Server; url: string }> {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname))
    const file = root + (path.endsWith('/') ? `${path}index.html` : path).slice(1)
    if (!file.startsWith(root) || file.includes(`${sep}..${sep}`)) {
      res.writeHead(403).end()
      return
    }
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const actual = typeof address === 'object' && address ? address.port : port
      resolve({ server, url: `http://127.0.0.1:${actual}/` })
    })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await serve(Number(process.env.PORT ?? 4173))
  console.log(`demo: ${url}demo/`)
}
