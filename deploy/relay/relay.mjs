import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.RELAY_PORT || 4015)
const startedAt = Date.now()
let nextClientId = 1
const clients = new Map()

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'vaib-relay', port: PORT, clients: clients.size, uptimeSec: Math.round((Date.now() - startedAt) / 1000) }))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({ server, path: '/signal' })

wss.on('connection', (ws) => {
  const id = nextClientId++
  clients.set(id, ws)

  ws.on('message', (raw) => {
    const data = raw.toString()
    for (const [peerId, peer] of clients) {
      if (peerId !== id && peer.readyState === 1) peer.send(data)
    }
  })

  ws.on('close', () => clients.delete(id))
  ws.on('error', () => clients.delete(id))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[vaib-relay] listening on :${PORT} (ws /signal)`)
})
