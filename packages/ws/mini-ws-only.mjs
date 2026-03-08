import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { WebSocket } from 'ws'
import { initWsServer, resetWs, getUpgradeHandler, broadcast } from './dist/ws-server.js'

async function withServer(fn) {
  resetWs(); initWsServer()
  const server = http.createServer()
  server.on('upgrade', getUpgradeHandler('/ws'))
  await new Promise((r) => server.listen(0, r))
  const port = server.address().port
  try { return await fn(port) }
  finally {
    resetWs()
    await new Promise((r) => { try { server.closeAllConnections() } catch{} server.close(() => r()) })
  }
}
function nextMsg(ws) { return new Promise((r) => ws.once('message', (raw) => r(JSON.parse(String(raw))))) }
async function openAndConsume(port) {
  const ws = await new Promise((resolve, reject) => {
    const w = new WebSocket(`ws://localhost:${port}/ws`)
    w.once('open', () => resolve(w)); w.once('error', reject)
  })
  await nextMsg(ws)
  return ws
}
async function send(ws, data) { const p = nextMsg(ws); ws.send(JSON.stringify(data)); return p }

describe('Channel A', () => {
  it('sync test 1', () => assert.ok(true))
  it('sync test 2', () => assert.ok(true))
})

describe('Channel B', () => {
  it('sync test 3', () => assert.ok(true))
})

describe('WebSocket tests', () => {
  it('connected', () => withServer(async (port) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`)
    const msg = await nextMsg(ws)
    assert.strictEqual(msg.type, 'connected')
    ws.terminate()
  }))

  it('ping pong', () => withServer(async (port) => {
    const ws = await openAndConsume(port)
    const msg = await send(ws, { type: 'ping' })
    assert.strictEqual(msg.type, 'pong')
    ws.terminate()
  }))
})
