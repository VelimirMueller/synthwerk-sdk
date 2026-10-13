// Static file server for the demo page. Run: pnpm --filter @synthwerk/tokens demo
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf'
}

/** Serves the package folder on 127.0.0.1. Port 0 picks a free port. */
export function serve(port = 0): Promise<{ server: Server; url: string }> {
  const server = createServer(async (req, res) => {
    let path: string
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    } catch {
      // Malformed percent-encoding (for example /%E0): answer 400, do not stop the server.
      res.writeHead(400).end('bad request')
      return
    }
    const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`)
    // Boundary check: the resolved file must stay inside the package folder.
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
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

// import.meta.main (Node >= 24) also works for paths with spaces, non-ASCII letters and symlinks.
if (import.meta.main) {
  const { url } = await serve(Number(process.env.PORT ?? 4173))
  console.log(`demo: ${url}demo/`)
}
