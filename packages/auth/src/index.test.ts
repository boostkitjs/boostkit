import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  auth,
  betterAuth,
  AuthMiddleware,
  type AuthUser,
  type AuthSession,
  type AuthResult,
  type BetterAuthConfig,
  type AuthDbConfig,
} from './index.js'

// Note: tests that actually boot the auth provider require better-auth,
// a Prisma client, and a running database. These tests verify factory
// contracts and middleware shape without opening any connections.

const baseConfig: BetterAuthConfig = {
  secret:  'test-secret-that-is-long-enough-32chars',
  baseUrl: 'http://localhost:3000',
}

describe('auth() factory', () => {
  it('is a function', () => {
    assert.strictEqual(typeof auth, 'function')
  })

  it('returns a constructor (ServiceProvider class)', () => {
    const Provider = auth(baseConfig)
    assert.strictEqual(typeof Provider, 'function')
  })

  it('works with minimal config', () => {
    assert.doesNotThrow(() => auth({}))
  })

  it('works with emailAndPassword options', () => {
    assert.doesNotThrow(() => auth({
      emailAndPassword: { enabled: true, requireEmailVerification: false },
    }))
  })

  it('works with socialProviders', () => {
    assert.doesNotThrow(() => auth({
      socialProviders: {
        github: { clientId: 'id', clientSecret: 'secret' },
      },
    }))
  })

  it('works with dbConfig', () => {
    const dbConfig: AuthDbConfig = { driver: 'sqlite', url: 'file:./test.db' }
    assert.doesNotThrow(() => auth(baseConfig, dbConfig))
  })

  it('works with all AuthDbConfig drivers', () => {
    const drivers = ['sqlite', 'postgresql', 'libsql', 'mysql'] as const
    for (const driver of drivers) {
      assert.doesNotThrow(() => auth(baseConfig, { driver, url: 'test://localhost' }))
    }
  })

  it('each call returns a different class', () => {
    const A = auth(baseConfig)
    const B = auth(baseConfig)
    assert.notStrictEqual(A, B)
  })
})

describe('betterAuth (deprecated alias)', () => {
  it('is the same function as auth', () => {
    assert.strictEqual(betterAuth, auth)
  })
})

describe('AuthMiddleware()', () => {
  it('is a function', () => {
    assert.strictEqual(typeof AuthMiddleware, 'function')
  })

  it('returns a MiddlewareHandler function', () => {
    const handler = AuthMiddleware()
    assert.strictEqual(typeof handler, 'function')
  })

  it('each call returns a new handler instance', () => {
    const a = AuthMiddleware()
    const b = AuthMiddleware()
    assert.notStrictEqual(a, b)
  })
})
