import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { prisma, database, type PrismaConfig, type DatabaseConfig } from './index.js'

// Note: tests that actually connect to a database require a generated Prisma
// client and a running DB. These tests verify factory contracts and adapter
// shapes without opening any connections.

describe('prisma() factory', () => {
  it('is a function', () => {
    assert.strictEqual(typeof prisma, 'function')
  })

  it('returns an object with a create() method', () => {
    const provider = prisma({})
    assert.strictEqual(typeof provider.create, 'function')
  })

  it('works with empty config', () => {
    assert.doesNotThrow(() => prisma({}))
  })

  it('works with sqlite driver', () => {
    const cfg: PrismaConfig = { driver: 'sqlite', url: 'file:./test.db' }
    assert.doesNotThrow(() => prisma(cfg))
  })

  it('works with postgresql driver', () => {
    const cfg: PrismaConfig = { driver: 'postgresql', url: 'postgresql://localhost/test' }
    assert.doesNotThrow(() => prisma(cfg))
  })

  it('works with libsql driver', () => {
    const cfg: PrismaConfig = { driver: 'libsql', url: 'libsql://localhost' }
    assert.doesNotThrow(() => prisma(cfg))
  })

  it('works with a pre-built client', () => {
    const fakeClient = { $connect: async () => {}, $disconnect: async () => {} }
    assert.doesNotThrow(() => prisma({ client: fakeClient }))
  })

  it('each call to prisma() returns a new provider instance', () => {
    const a = prisma({})
    const b = prisma({})
    assert.notStrictEqual(a, b)
  })
})

describe('database() factory', () => {
  it('is a function', () => {
    assert.strictEqual(typeof database, 'function')
  })

  it('returns a constructor (class)', () => {
    const Provider = database()
    assert.strictEqual(typeof Provider, 'function')
  })

  it('works with a full DatabaseConfig', () => {
    const cfg: DatabaseConfig = {
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', url: 'file:./test.db' },
      },
    }
    assert.doesNotThrow(() => database(cfg))
  })

  it('each call to database() returns a different class', () => {
    const A = database()
    const B = database()
    assert.notStrictEqual(A, B)
  })
})
