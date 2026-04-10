import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorage, createEntry, TelescopeRegistry, Telescope } from './index.js'
import type { TelescopeEntry } from './types.js'

// ─── createEntry helper ───────────────────────────────────

describe('createEntry', () => {
  it('creates an entry with required fields', () => {
    const entry = createEntry('request', { url: '/api/test', method: 'GET' })

    assert.ok(entry.id)
    assert.equal(entry.type, 'request')
    assert.equal(entry.content['url'], '/api/test')
    assert.ok(entry.createdAt instanceof Date)
    assert.deepStrictEqual(entry.tags, [])
    assert.equal(entry.batchId, null)
    assert.equal(entry.familyHash, null)
  })

  it('accepts optional batchId, tags, familyHash', () => {
    const entry = createEntry('query', { sql: 'SELECT 1' }, {
      batchId: 'batch-1',
      tags: ['slow', 'auth'],
      familyHash: 'abc',
    })

    assert.equal(entry.batchId, 'batch-1')
    assert.deepStrictEqual(entry.tags, ['slow', 'auth'])
    assert.equal(entry.familyHash, 'abc')
  })
})

// ─── MemoryStorage ────────────────────────────────────────

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage(100)
  })

  // Store and find

  it('stores and finds an entry by ID', () => {
    const entry = createEntry('request', { url: '/test' })
    storage.store(entry)

    const found = storage.find(entry.id)
    assert.ok(found)
    assert.equal(found.id, entry.id)
    assert.equal(found.type, 'request')
  })

  it('returns null for unknown ID', () => {
    assert.equal(storage.find('nonexistent'), null)
  })

  it('stores batch of entries', () => {
    const entries = [
      createEntry('request', { url: '/a' }),
      createEntry('query', { sql: 'SELECT 1' }),
      createEntry('log', { message: 'hello' }),
    ]
    storage.storeBatch(entries)

    assert.equal(storage.count(), 3)
  })

  // List with filters

  it('lists entries by type', () => {
    storage.store(createEntry('request', { url: '/a' }))
    storage.store(createEntry('query', { sql: 'SELECT 1' }))
    storage.store(createEntry('request', { url: '/b' }))

    const requests = storage.list({ type: 'request' })
    assert.equal(requests.length, 2)

    const queries = storage.list({ type: 'query' })
    assert.equal(queries.length, 1)
  })

  it('lists entries with search filter', () => {
    storage.store(createEntry('request', { url: '/api/users' }))
    storage.store(createEntry('request', { url: '/api/products' }))

    const results = storage.list({ type: 'request', search: 'users' })
    assert.equal(results.length, 1)
    assert.equal(results[0]!.content['url'], '/api/users')
  })

  it('lists entries by batchId', () => {
    storage.store(createEntry('request', { url: '/a' }, { batchId: 'b1' }))
    storage.store(createEntry('query', { sql: 'x' }, { batchId: 'b1' }))
    storage.store(createEntry('request', { url: '/c' }, { batchId: 'b2' }))

    const batch1 = storage.list({ batchId: 'b1' })
    assert.equal(batch1.length, 2)
  })

  it('lists entries by tag', () => {
    storage.store(createEntry('query', { sql: 'x' }, { tags: ['slow'] }))
    storage.store(createEntry('query', { sql: 'y' }, { tags: ['fast'] }))

    const slow = storage.list({ tag: 'slow' })
    assert.equal(slow.length, 1)
  })

  it('paginates list results', () => {
    for (let i = 0; i < 10; i++) {
      storage.store(createEntry('request', { i }))
    }

    const page1 = storage.list({ page: 1, perPage: 3 })
    const page2 = storage.list({ page: 2, perPage: 3 })

    assert.equal(page1.length, 3)
    assert.equal(page2.length, 3)
  })

  // Count

  it('counts all entries', () => {
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))
    storage.store(createEntry('request', {}))

    assert.equal(storage.count(), 3)
  })

  it('counts by type', () => {
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))
    storage.store(createEntry('request', {}))

    assert.equal(storage.count('request'), 2)
    assert.equal(storage.count('query'), 1)
    assert.equal(storage.count('job'), 0)
  })

  // Prune

  it('prunes all entries', () => {
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))

    storage.prune()
    assert.equal(storage.count(), 0)
  })

  it('prunes by type', () => {
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))

    storage.prune('request')
    assert.equal(storage.count(), 1)
    assert.equal(storage.count('query'), 1)
  })

  it('prunes older than date', () => {
    const entry = createEntry('request', {})
    storage.store(entry)

    // Prune everything before a future date
    storage.pruneOlderThan(new Date(Date.now() + 1000))
    assert.equal(storage.count(), 0)
  })

  // Max entries

  it('respects maxEntries limit', () => {
    const small = new MemoryStorage(3)
    for (let i = 0; i < 5; i++) {
      small.store(createEntry('request', { i }))
    }
    assert.equal(small.count(), 3)
  })
})

// ─── TelescopeRegistry ───────────────────────────────────

describe('TelescopeRegistry', () => {
  beforeEach(() => {
    TelescopeRegistry.reset()
  })

  it('starts with null', () => {
    assert.equal(TelescopeRegistry.get(), null)
  })

  it('set and get round-trips', () => {
    const storage = new MemoryStorage()
    TelescopeRegistry.set(storage)
    assert.strictEqual(TelescopeRegistry.get(), storage)
  })

  it('reset clears storage', () => {
    TelescopeRegistry.set(new MemoryStorage())
    TelescopeRegistry.reset()
    assert.equal(TelescopeRegistry.get(), null)
  })
})

// ─── Telescope Facade ────────────────────────────────────

describe('Telescope facade', () => {
  beforeEach(() => {
    TelescopeRegistry.reset()
  })

  it('throws when no storage registered', () => {
    assert.throws(() => Telescope.list(), /No storage registered/)
  })

  it('list() delegates to storage', () => {
    const storage = new MemoryStorage()
    storage.store(createEntry('request', { url: '/test' }))
    TelescopeRegistry.set(storage)

    const entries = Telescope.list({ type: 'request' }) as TelescopeEntry[]
    assert.equal(entries.length, 1)
  })

  it('find() returns entry by ID', () => {
    const storage = new MemoryStorage()
    const entry = createEntry('query', { sql: 'SELECT 1' })
    storage.store(entry)
    TelescopeRegistry.set(storage)

    const found = Telescope.find(entry.id) as TelescopeEntry | null
    assert.ok(found)
    assert.equal(found.type, 'query')
  })

  it('count() returns total entries', () => {
    const storage = new MemoryStorage()
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))
    TelescopeRegistry.set(storage)

    assert.equal(Telescope.count() as number, 2)
    assert.equal(Telescope.count('request') as number, 1)
  })

  it('prune() clears entries', () => {
    const storage = new MemoryStorage()
    storage.store(createEntry('request', {}))
    storage.store(createEntry('query', {}))
    TelescopeRegistry.set(storage)

    Telescope.prune('request')
    assert.equal(Telescope.count() as number, 1)
  })

  it('record() stores an entry', () => {
    const storage = new MemoryStorage()
    TelescopeRegistry.set(storage)

    const entry = createEntry('log', { message: 'test' })
    Telescope.record(entry)

    assert.equal(Telescope.count() as number, 1)
  })
})
