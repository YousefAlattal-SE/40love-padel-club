import assert from 'node:assert/strict'
import { once } from 'node:events'
import http from 'node:http'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

test('the development API proxy preserves the browser host and origin on POST', async (t) => {
  const upstream = http.createServer((request, response) => {
    response.end(JSON.stringify([request.method, request.headers.host, request.headers.origin]))
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  t.after(() => new Promise(resolve => upstream.close(resolve)))
  const target = `http://127.0.0.1:${upstream.address().port}`
  const vite = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, hmr: false },
    logLevel: 'silent',
    plugins: [{
      name: 'use-isolated-api-upstream',
      configResolved(config) {
        const proxy = config.server.proxy
        // Change only the destination. Preserve Vite's behavior for string shorthand.
        if (typeof proxy['/api'] === 'string') proxy['/api'] = target
        else proxy['/api'].target = target
      },
    }],
  })
  t.after(() => vite.close())
  await vite.listen()
  const origin = new URL(`http://127.0.0.1:${vite.httpServer.address().port}`)
  const response = await fetch(new URL('/api/example', origin), {
    method: 'POST', headers: { Origin: origin.origin },
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), ['POST', origin.host, origin.origin])
})
