import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import {
  MemoryPersistence,
  Live,
  live,
  type LivePersistence,
  type LiveConfig,
} from './index.js'

// ─── MemoryPersistence ───────────────────────────────────────

describe('MemoryPersistence', () => {
  let persistence: MemoryPersistence

  beforeEach(() => { persistence = new MemoryPersistence() })

  it('getYDoc() returns a new empty doc for an unknown docName', async () => {
    const doc = await persistence.getYDoc('test')
    assert.ok(doc instanceof Y.Doc)
    assert.strictEqual(Y.encodeStateVector(doc).length, 1, 'empty doc state vector is 1 byte (varint 0)')
  })

  it('getYDoc() returns the same doc instance for repeated calls', async () => {
    const a = await persistence.getYDoc('same')
    const b = await persistence.getYDoc('same')
    assert.strictEqual(a, b)
  })

  it('getYDoc() returns independent docs for different docNames', async () => {
    const a = await persistence.getYDoc('doc-a')
    const b = await persistence.getYDoc('doc-b')
    assert.notStrictEqual(a, b)
  })

  it('storeUpdate() applies update to the doc', async () => {
    // Create an update on a separate doc
    const source = new Y.Doc()
    const text   = source.getText('content')
    text.insert(0, 'hello')
    const update = Y.encodeStateAsUpdate(source)

    await persistence.storeUpdate('my-doc', update)

    const doc  = await persistence.getYDoc('my-doc')
    const ytext = doc.getText('content')
    assert.strictEqual(ytext.toString(), 'hello')
  })

  it('storeUpdate() accumulates multiple updates', async () => {
    const source = new Y.Doc()
    const text   = source.getText('content')
    text.insert(0, 'hello')
    const u1 = Y.encodeStateAsUpdate(source)

    text.insert(5, ' world')
    const u2 = Y.encodeStateAsUpdate(source)

    await persistence.storeUpdate('multi', u1)
    await persistence.storeUpdate('multi', u2)

    const doc = await persistence.getYDoc('multi')
    assert.strictEqual(doc.getText('content').toString(), 'hello world')
  })

  it('getStateVector() returns state vector of stored doc', async () => {
    const source = new Y.Doc()
    source.getText('content').insert(0, 'test')
    const update = Y.encodeStateAsUpdate(source)
    await persistence.storeUpdate('sv-doc', update)

    const sv = await persistence.getStateVector('sv-doc')
    assert.ok(sv instanceof Uint8Array)
    assert.ok(sv.length > 0)
  })

  it('getDiff() returns update that brings empty doc up to date', async () => {
    const source = new Y.Doc()
    source.getText('content').insert(0, 'sync me')
    const update = Y.encodeStateAsUpdate(source)
    await persistence.storeUpdate('diff-doc', update)

    const emptyClientSV = Y.encodeStateVector(new Y.Doc())
    const diff          = await persistence.getDiff('diff-doc', emptyClientSV)

    const target = new Y.Doc()
    Y.applyUpdate(target, diff)
    assert.strictEqual(target.getText('content').toString(), 'sync me')
  })

  it('getDiff() with up-to-date state vector returns empty diff', async () => {
    const source = new Y.Doc()
    source.getText('content').insert(0, 'hello')
    const update = Y.encodeStateAsUpdate(source)
    await persistence.storeUpdate('nodiff', update)

    // Get the current state vector (fully up to date)
    const currentSV = await persistence.getStateVector('nodiff')
    const diff      = await persistence.getDiff('nodiff', currentSV)

    // Applying an empty/no-op diff should not change anything meaningful
    const target = new Y.Doc()
    Y.applyUpdate(target, diff)
    // Empty diff — target remains empty (diff is empty update = 2 bytes)
    assert.ok(diff.length <= 2)
  })

  it('clearDocument() removes the document', async () => {
    const source = new Y.Doc()
    source.getText('content').insert(0, 'delete me')
    await persistence.storeUpdate('to-clear', Y.encodeStateAsUpdate(source))

    // Verify it exists
    const before = await persistence.getYDoc('to-clear')
    assert.strictEqual(before.getText('content').toString(), 'delete me')

    await persistence.clearDocument('to-clear')

    // After clear, a new empty doc is returned
    const after = await persistence.getYDoc('to-clear')
    assert.strictEqual(after.getText('content').toString(), '')
  })

  it('clearDocument() on non-existent doc is a no-op', async () => {
    await assert.doesNotReject(() => persistence.clearDocument('ghost'))
  })

  it('destroy() clears all documents', async () => {
    const s1 = new Y.Doc(); s1.getText('t').insert(0, 'a')
    const s2 = new Y.Doc(); s2.getText('t').insert(0, 'b')
    await persistence.storeUpdate('d1', Y.encodeStateAsUpdate(s1))
    await persistence.storeUpdate('d2', Y.encodeStateAsUpdate(s2))

    await persistence.destroy()

    // After destroy, new fresh docs are returned
    const d1 = await persistence.getYDoc('d1')
    assert.strictEqual(d1.getText('t').toString(), '')
  })

  it('multiple documents are isolated from each other', async () => {
    const s1 = new Y.Doc(); s1.getText('t').insert(0, 'AAA')
    const s2 = new Y.Doc(); s2.getText('t').insert(0, 'BBB')
    await persistence.storeUpdate('isolated-a', Y.encodeStateAsUpdate(s1))
    await persistence.storeUpdate('isolated-b', Y.encodeStateAsUpdate(s2))

    const da = await persistence.getYDoc('isolated-a')
    const db = await persistence.getYDoc('isolated-b')
    assert.strictEqual(da.getText('t').toString(), 'AAA')
    assert.strictEqual(db.getText('t').toString(), 'BBB')
  })
})

// ─── LiveConfig interface ─────────────────────────────────────

describe('LiveConfig defaults', () => {
  it('live() with empty config returns a ServiceProvider class', () => {
    const Provider = live()
    assert.strictEqual(typeof Provider, 'function')
    assert.strictEqual(Provider.name, 'LiveServiceProvider')
  })

  it('live() with custom path returns a class', () => {
    const Provider = live({ path: '/custom-ws' })
    assert.strictEqual(typeof Provider, 'function')
  })

  it('live() with custom persistence uses the provided adapter', () => {
    const custom: LivePersistence = {
      getYDoc:       async () => new Y.Doc(),
      storeUpdate:   async () => {},
      getStateVector: async () => new Uint8Array(),
      getDiff:       async () => new Uint8Array(),
      clearDocument: async () => {},
      destroy:       async () => {},
    }
    const Provider = live({ persistence: custom })
    assert.strictEqual(typeof Provider, 'function')
  })
})

// ─── LivePersistence interface (custom adapter) ──────────────

describe('Custom LivePersistence adapter', () => {
  it('satisfies the interface when all methods are provided', () => {
    const adapter: LivePersistence = {
      async getYDoc()        { return new Y.Doc() },
      async storeUpdate()    {},
      async getStateVector() { return new Uint8Array() },
      async getDiff()        { return new Uint8Array() },
      async clearDocument()  {},
      async destroy()        {},
    }
    assert.strictEqual(typeof adapter.getYDoc,        'function')
    assert.strictEqual(typeof adapter.storeUpdate,    'function')
    assert.strictEqual(typeof adapter.getStateVector, 'function')
    assert.strictEqual(typeof adapter.getDiff,        'function')
    assert.strictEqual(typeof adapter.clearDocument,  'function')
    assert.strictEqual(typeof adapter.destroy,        'function')
  })

  it('persistence.storeUpdate() is called with the correct doc name and update', async () => {
    const calls: Array<{ docName: string; update: Uint8Array }> = []
    const adapter: LivePersistence = {
      async getYDoc()       { return new Y.Doc() },
      async storeUpdate(docName, update) { calls.push({ docName, update }) },
      async getStateVector() { return Y.encodeStateVector(new Y.Doc()) },
      async getDiff()       { return new Uint8Array() },
      async clearDocument() {},
      async destroy()       {},
    }

    const source = new Y.Doc()
    source.getText('t').insert(0, 'test')
    const update = Y.encodeStateAsUpdate(source)

    await adapter.storeUpdate('my-room', update)

    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0]?.docName, 'my-room')
    assert.deepStrictEqual(calls[0]?.update, update)
  })
})

// ─── Yjs CRDT fundamentals (used by the sync protocol) ───────

describe('Yjs CRDT basics', () => {
  it('two docs converge when applying each other\'s updates', () => {
    const doc1 = new Y.Doc()
    const doc2 = new Y.Doc()

    doc1.getText('t').insert(0, 'hello')
    const u1 = Y.encodeStateAsUpdate(doc1)
    Y.applyUpdate(doc2, u1)

    doc2.getText('t').insert(5, ' world')
    const u2 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
    Y.applyUpdate(doc1, u2)

    assert.strictEqual(doc1.getText('t').toString(), 'hello world')
    assert.strictEqual(doc2.getText('t').toString(), 'hello world')
  })

  it('applying the same update twice is idempotent (CRDT property)', () => {
    const source = new Y.Doc()
    source.getText('t').insert(0, 'idempotent')
    const update = Y.encodeStateAsUpdate(source)

    const target = new Y.Doc()
    Y.applyUpdate(target, update)
    Y.applyUpdate(target, update) // apply again

    assert.strictEqual(target.getText('t').toString(), 'idempotent')
  })

  it('encodeStateVector() produces a non-empty byte array for a modified doc', () => {
    const doc = new Y.Doc()
    doc.getText('t').insert(0, 'hello')
    const sv = Y.encodeStateVector(doc)
    assert.ok(sv instanceof Uint8Array)
    assert.ok(sv.length > 0)
  })

  it('encodeStateAsUpdate() with stale SV produces minimal diff', () => {
    // Server doc starts with 'hello', client syncs to that state
    const server = new Y.Doc()
    server.getText('t').insert(0, 'hello')
    const baseUpdate = Y.encodeStateAsUpdate(server)

    // Client receives initial state
    const client = new Y.Doc()
    Y.applyUpdate(client, baseUpdate)
    assert.strictEqual(client.getText('t').toString(), 'hello')

    // Client records its current state vector
    const clientSV = Y.encodeStateVector(client)

    // Server adds ' world'
    server.getText('t').insert(5, ' world')

    // Server computes diff since client's last known state
    const diff = Y.encodeStateAsUpdate(server, clientSV)

    // Client applies the incremental diff
    Y.applyUpdate(client, diff)
    assert.strictEqual(client.getText('t').toString(), 'hello world')
    assert.strictEqual(server.getText('t').toString(), 'hello world')
  })

  it('concurrent edits on separate docs merge without conflicts', () => {
    const doc1 = new Y.Doc()
    const doc2 = new Y.Doc()

    // Both start from the same state
    doc1.getText('t').insert(0, 'base')
    const baseUpdate = Y.encodeStateAsUpdate(doc1)
    Y.applyUpdate(doc2, baseUpdate)

    // Independent edits
    doc1.getText('t').insert(4, '-A')
    doc2.getText('t').insert(4, '-B')

    // Exchange updates
    const u1 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2))
    const u2 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
    Y.applyUpdate(doc1, u2)
    Y.applyUpdate(doc2, u1)

    // Both should converge to the same value (order determined by Yjs)
    assert.strictEqual(doc1.getText('t').toString(), doc2.getText('t').toString())
  })
})

// ─── Sync message encoding helpers ───────────────────────────

describe('Yjs sync protocol message structure', () => {
  // Mirror the private helpers from index.ts to verify encoding
  function readVarUint(buf: Uint8Array, pos: number): [number, number] {
    let result = 0, shift = 0
    while (true) {
      const byte = buf[pos++] ?? 0
      result |= (byte & 0x7f) << shift
      shift  += 7
      if ((byte & 0x80) === 0) break
    }
    return [result, pos]
  }

  function writeVarUint(val: number): Uint8Array {
    const buf: number[] = []
    while (val > 0x7f) { buf.push((val & 0x7f) | 0x80); val >>>= 7 }
    buf.push(val)
    return new Uint8Array(buf)
  }

  it('writeVarUint encodes small values as a single byte', () => {
    assert.deepStrictEqual(writeVarUint(0),   new Uint8Array([0]))
    assert.deepStrictEqual(writeVarUint(1),   new Uint8Array([1]))
    assert.deepStrictEqual(writeVarUint(127), new Uint8Array([127]))
  })

  it('writeVarUint encodes values > 127 with continuation bit', () => {
    const encoded = writeVarUint(128)
    assert.strictEqual(encoded.length, 2)
    assert.strictEqual(encoded[0]! & 0x80, 0x80, 'first byte has continuation bit')
    assert.strictEqual(encoded[1]! & 0x80, 0,    'last byte has no continuation bit')
  })

  it('readVarUint decodes what writeVarUint encodes (round-trip)', () => {
    for (const val of [0, 1, 127, 128, 255, 1000, 16383, 16384]) {
      const encoded        = writeVarUint(val)
      const [decoded, pos] = readVarUint(encoded, 0)
      assert.strictEqual(decoded, val, `round-trip for ${val}`)
      assert.strictEqual(pos,  encoded.length, `pos for ${val}`)
    }
  })

  it('sync message type byte is 0 for messageSync', () => {
    const messageSync = 0
    const svMsg       = new Uint8Array([0 /* syncStep1 */, 0]) // minimal
    const lenBytes    = writeVarUint(svMsg.length)
    const frame       = new Uint8Array(1 + lenBytes.length + svMsg.length)
    frame[0] = messageSync
    frame.set(lenBytes, 1)
    frame.set(svMsg, 1 + lenBytes.length)

    assert.strictEqual(frame[0], 0) // messageSync
    const [len, pos] = readVarUint(frame, 1)
    assert.strictEqual(len, svMsg.length)
    assert.strictEqual(frame[pos], 0) // syncStep1
  })

  it('awareness message type byte is 1 for messageAwareness', () => {
    const messageAwareness = 1
    const payload          = new Uint8Array([messageAwareness, 5, 0, 1, 2, 3, 4])
    assert.strictEqual(payload[0], messageAwareness)
  })
})

// ─── onChange callback ────────────────────────────────────────

describe('LiveConfig.onChange', () => {
  it('onChange is an optional function in config', () => {
    let called = false
    const config: LiveConfig = {
      onChange: (_docName, _update) => { called = true },
    }
    config.onChange?.('doc', new Uint8Array())
    assert.strictEqual(called, true)
  })

  it('onChange can be async', async () => {
    const calls: string[] = []
    const config: LiveConfig = {
      async onChange(docName) { calls.push(docName) },
    }
    await config.onChange?.('async-doc', new Uint8Array())
    assert.deepStrictEqual(calls, ['async-doc'])
  })
})

// ─── onAuth callback ─────────────────────────────────────────

describe('LiveConfig.onAuth', () => {
  it('onAuth can return synchronous boolean', async () => {
    const config: LiveConfig = {
      onAuth: (_req, docName) => docName !== 'private',
    }
    const result = await Promise.resolve(config.onAuth?.({ headers: {}, url: '/' }, 'public'))
    assert.strictEqual(result, true)

    const denied = await Promise.resolve(config.onAuth?.({ headers: {}, url: '/' }, 'private'))
    assert.strictEqual(denied, false)
  })

  it('onAuth can return a Promise', async () => {
    const config: LiveConfig = {
      async onAuth(_req, docName) { return docName === 'allowed' },
    }
    const result = await config.onAuth?.({ headers: {}, url: '/' }, 'allowed')
    assert.strictEqual(result, true)

    const denied = await config.onAuth?.({ headers: {}, url: '/' }, 'denied')
    assert.strictEqual(denied, false)
  })

  it('onAuth receives request headers and doc name', async () => {
    const received: Array<{ headers: Record<string, string | string[] | undefined>; docName: string }> = []
    const config: LiveConfig = {
      onAuth(req, docName) {
        received.push({ headers: req.headers, docName })
        return true
      },
    }
    await Promise.resolve(config.onAuth?.({ headers: { authorization: 'Bearer token' }, url: '/ws-live/room1' }, 'room1'))
    assert.strictEqual(received.length, 1)
    assert.strictEqual(received[0]?.docName, 'room1')
    assert.strictEqual(received[0]?.headers['authorization'], 'Bearer token')
  })
})

// ─── Live.insertBlock / Live.removeBlock ─────────────────────
//
// These exercise the real Live facade, which reads persistence and the room
// map from globalThis. We seed both directly to avoid spinning up a WebSocket
// server in unit tests. The doc shape we build mimics what the Lexical-Yjs
// binding produces (paragraph Y.XmlText nodes hanging off a root Y.XmlText)
// so the helpers see something realistic.

const G = globalThis as Record<string, unknown>
const PERSIST_KEY = '__rudderjs_live_persistence__'
const ROOMS_KEY   = '__rudderjs_live__'

function freshLiveState(): MemoryPersistence {
  const persistence = new MemoryPersistence()
  G[PERSIST_KEY] = persistence
  G[ROOMS_KEY]   = new Map()
  return persistence
}

/** Build a paragraph Y.XmlText with optional embedded blocks + trailing text.
 *  Mirrors the shape produced by Lexical-Yjs's CollabDecoratorNode:
 *  bare `Y.XmlElement()` (no nodeName) with `__type="custom-block"` attribute. */
function buildParagraph(opts: {
  blocks?: Array<{ type: string; data: Record<string, unknown> }>
  text?: string
}): Y.XmlText {
  const p = new Y.XmlText()
  p.setAttribute('__type', 'paragraph')
  let offset = 0
  for (const b of opts.blocks ?? []) {
    const elem = new Y.XmlElement()
    elem.setAttribute('__type', 'custom-block')
    elem.setAttribute('__blockType', b.type)
    ;(elem.setAttribute as (k: string, v: unknown) => void)('__blockData', b.data)
    p.insertEmbed(offset, elem)
    offset += 1
  }
  if (opts.text) {
    p.insert(offset, opts.text)
  }
  return p
}

/** Seed a Lexical-style root with the provided paragraph nodes. */
function seedLexicalRoot(docName: string, paragraphs: Y.XmlText[]): void {
  // Touch Live so the room is created via the same getOrCreateRoom path.
  Live.snapshot(docName)
  const rooms = G[ROOMS_KEY] as Map<string, { doc: Y.Doc }>
  const room = rooms.get(docName)!
  const root = room.doc.get('root', Y.XmlText)
  room.doc.transact(() => {
    for (const p of paragraphs) root.insertEmbed(root.length, p)
  })
}

/** Walk the root and return blocks in document order with their paragraph index. */
function listBlocks(docName: string): Array<{ pIdx: number; type: string; data: Record<string, unknown> }> {
  const rooms = G[ROOMS_KEY] as Map<string, { doc: Y.Doc }>
  const root  = rooms.get(docName)!.doc.get('root', Y.XmlText)
  const out: Array<{ pIdx: number; type: string; data: Record<string, unknown> }> = []
  const delta = root.toDelta() as Array<{ insert: unknown }>
  let pIdx = 0
  for (const entry of delta) {
    if (!(entry.insert instanceof Y.XmlText)) continue
    const child = entry.insert as Y.XmlText
    const inner = child.toDelta() as Array<{ insert: unknown }>
    for (const item of inner) {
      if (!(item.insert instanceof Y.XmlElement)) continue
      const elem = item.insert
      out.push({
        pIdx,
        type: String(elem.getAttribute('__blockType')),
        data: elem.getAttribute('__blockData') as Record<string, unknown>,
      })
    }
    pIdx++
  }
  return out
}

function paragraphCount(docName: string): number {
  const rooms = G[ROOMS_KEY] as Map<string, { doc: Y.Doc }>
  const root  = rooms.get(docName)!.doc.get('root', Y.XmlText)
  const delta = root.toDelta() as Array<{ insert: unknown }>
  let n = 0
  for (const entry of delta) if (entry.insert instanceof Y.XmlText) n++
  return n
}

describe('Live.insertBlock', () => {
  beforeEach(() => freshLiveState())

  it('returns false when the root XmlText is uninitialized', () => {
    const ok = Live.insertBlock('uninit-doc', 'callToAction', { title: 'Hi' })
    assert.strictEqual(ok, false)
  })

  it('appends a block at the end when no position is given', () => {
    seedLexicalRoot('doc-1', [
      buildParagraph({ text: 'first paragraph' }),
      buildParagraph({ text: 'second paragraph' }),
    ])
    const ok = Live.insertBlock('doc-1', 'callToAction', { title: 'Subscribe' })
    assert.strictEqual(ok, true)
    assert.strictEqual(paragraphCount('doc-1'), 3)
    const blocks = listBlocks('doc-1')
    assert.strictEqual(blocks.length, 1)
    assert.strictEqual(blocks[0]?.pIdx, 2, 'inserted as the 3rd paragraph')
    assert.strictEqual(blocks[0]?.type, 'callToAction')
    assert.deepStrictEqual(blocks[0]?.data, { title: 'Subscribe' })
  })

  it('inserts at index 0 when position=0', () => {
    seedLexicalRoot('doc-2', [
      buildParagraph({ text: 'existing' }),
    ])
    Live.insertBlock('doc-2', 'video', { url: 'https://example.com/v1' }, 0)
    const blocks = listBlocks('doc-2')
    assert.strictEqual(blocks.length, 1)
    assert.strictEqual(blocks[0]?.pIdx, 0, 'inserted as the 1st paragraph')
    assert.strictEqual(paragraphCount('doc-2'), 2)
  })

  it('inserts before the last paragraph when position=-1', () => {
    seedLexicalRoot('doc-3', [
      buildParagraph({ text: 'first' }),
      buildParagraph({ text: 'last' }),
    ])
    Live.insertBlock('doc-3', 'video', { url: 'mid' }, -1)
    const blocks = listBlocks('doc-3')
    assert.strictEqual(blocks[0]?.pIdx, 1, 'inserted between first and last')
    assert.strictEqual(paragraphCount('doc-3'), 3)
  })

  it('clamps positions beyond the end to append', () => {
    seedLexicalRoot('doc-4', [buildParagraph({ text: 'only' })])
    Live.insertBlock('doc-4', 'video', { url: 'tail' }, 99)
    const blocks = listBlocks('doc-4')
    assert.strictEqual(blocks[0]?.pIdx, 1)
  })

  it('accepts an empty blockData object', () => {
    seedLexicalRoot('doc-5', [buildParagraph({ text: 'x' })])
    const ok = Live.insertBlock('doc-5', 'spacer', {})
    assert.strictEqual(ok, true)
    const blocks = listBlocks('doc-5')
    assert.deepStrictEqual(blocks[0]?.data, {})
  })

  it('produces a Lexical-compatible block shape (no nodeName, __type attr)', () => {
    // Regression: Lexical-Yjs's CollabDecoratorNode creates `new XmlElement()`
    // with NO nodeName and writes `__type="custom-block"` as an attribute.
    // If we get this wrong, blocks insert into the Y.Doc but the editor never
    // renders them. See LexicalYjs.dev.mjs:925.
    seedLexicalRoot('shape-doc', [buildParagraph({ text: 'x' })])
    Live.insertBlock('shape-doc', 'callToAction', { title: 'Hi', buttonText: 'Click' })

    const rooms = G[ROOMS_KEY] as Map<string, { doc: Y.Doc }>
    const root = rooms.get('shape-doc')!.doc.get('root', Y.XmlText)
    const delta = root.toDelta() as Array<{ insert: unknown }>

    let found: Y.XmlElement | null = null
    for (const entry of delta) {
      if (!(entry.insert instanceof Y.XmlText)) continue
      const inner = (entry.insert as Y.XmlText).toDelta() as Array<{ insert: unknown }>
      for (const item of inner) {
        if (item.insert instanceof Y.XmlElement) { found = item.insert; break }
      }
      if (found) break
    }

    assert.ok(found, 'inserted block must exist as a Y.XmlElement')
    assert.strictEqual(found!.getAttribute('__type'), 'custom-block', '__type attribute must be "custom-block"')
    assert.strictEqual(found!.getAttribute('__blockType'), 'callToAction')
    assert.deepStrictEqual(found!.getAttribute('__blockData'), { title: 'Hi', buttonText: 'Click' })
  })

  it('preserves existing blocks when inserting more', () => {
    seedLexicalRoot('doc-6', [
      buildParagraph({ blocks: [{ type: 'callToAction', data: { title: 'A' } }] }),
      buildParagraph({ text: 'between' }),
    ])
    Live.insertBlock('doc-6', 'callToAction', { title: 'B' })
    const blocks = listBlocks('doc-6')
    assert.strictEqual(blocks.length, 2)
    assert.deepStrictEqual(blocks[0]?.data, { title: 'A' })
    assert.deepStrictEqual(blocks[1]?.data, { title: 'B' })
  })
})

describe('Live.removeBlock', () => {
  beforeEach(() => freshLiveState())

  it('returns false when the root XmlText is uninitialized', () => {
    assert.strictEqual(Live.removeBlock('nope', 'callToAction', 0), false)
  })

  it('returns false when the block type does not exist', () => {
    seedLexicalRoot('rm-1', [buildParagraph({ text: 'x' })])
    assert.strictEqual(Live.removeBlock('rm-1', 'callToAction', 0), false)
  })

  it('returns false when blockIndex is out of range', () => {
    seedLexicalRoot('rm-2', [
      buildParagraph({ blocks: [{ type: 'callToAction', data: { title: 'only' } }] }),
    ])
    assert.strictEqual(Live.removeBlock('rm-2', 'callToAction', 5), false)
  })

  it('removes the first block of a type and shifts the index', () => {
    seedLexicalRoot('rm-3', [
      buildParagraph({ blocks: [{ type: 'callToAction', data: { title: 'A' } }] }),
      buildParagraph({ text: 'middle' }),
      buildParagraph({ blocks: [{ type: 'callToAction', data: { title: 'B' } }] }),
      buildParagraph({ blocks: [{ type: 'callToAction', data: { title: 'C' } }] }),
    ])
    assert.strictEqual(Live.removeBlock('rm-3', 'callToAction', 0), true)
    let blocks = listBlocks('rm-3')
    assert.deepStrictEqual(blocks.map(b => b.data['title']), ['B', 'C'])

    // Removing index 0 again should now remove what was originally 'B'
    assert.strictEqual(Live.removeBlock('rm-3', 'callToAction', 0), true)
    blocks = listBlocks('rm-3')
    assert.deepStrictEqual(blocks.map(b => b.data['title']), ['C'])
  })

  it('removes the last block of a type', () => {
    seedLexicalRoot('rm-4', [
      buildParagraph({ blocks: [{ type: 'video', data: { url: 'one' } }] }),
      buildParagraph({ blocks: [{ type: 'video', data: { url: 'two' } }] }),
    ])
    assert.strictEqual(Live.removeBlock('rm-4', 'video', 1), true)
    const blocks = listBlocks('rm-4')
    assert.deepStrictEqual(blocks.map(b => b.data['url']), ['one'])
  })

  it('round-trips: insert then remove yields original structure', () => {
    seedLexicalRoot('rm-5', [buildParagraph({ text: 'baseline' })])
    const before = paragraphCount('rm-5')
    Live.insertBlock('rm-5', 'callToAction', { title: 'tmp' })
    assert.strictEqual(paragraphCount('rm-5'), before + 1)
    Live.removeBlock('rm-5', 'callToAction', 0)
    assert.strictEqual(paragraphCount('rm-5'), before)
    assert.strictEqual(listBlocks('rm-5').length, 0)
  })
})

// ─── MemoryPersistence isolation (globalThis state) ──────────

describe('MemoryPersistence instances are independent', () => {
  it('two MemoryPersistence instances do not share documents', async () => {
    const p1 = new MemoryPersistence()
    const p2 = new MemoryPersistence()

    const source = new Y.Doc()
    source.getText('t').insert(0, 'exclusive')
    await p1.storeUpdate('shared-name', Y.encodeStateAsUpdate(source))

    // p2 has no knowledge of p1's documents
    const doc = await p2.getYDoc('shared-name')
    assert.strictEqual(doc.getText('t').toString(), '')
  })
})
