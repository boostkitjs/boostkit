import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { getAppInfo } from './tools/app-info.js'
import { getDbSchema } from './tools/db-schema.js'
import { getConfigValue } from './tools/config-get.js'
import { getRouteList } from './tools/route-list.js'
import { getModelList } from './tools/model-list.js'
import { getLastError } from './tools/last-error.js'
import { createBoostServer, BoostProvider } from './index.js'

// Use the playground as the test project
const PLAYGROUND = join(import.meta.dirname, '..', '..', '..', 'playground')

// ─── app_info ─────────────────────────────────────────────

describe('getAppInfo', () => {
  it('returns project info from playground', () => {
    const info = getAppInfo(PLAYGROUND)
    assert.ok(info['name'])
    assert.ok(info['node'])
    assert.ok(Array.isArray(info['rudderPackages']))
    assert.ok((info['rudderPackages'] as unknown[]).length > 0)
  })

  it('detects pnpm as package manager', () => {
    const info = getAppInfo(PLAYGROUND)
    assert.strictEqual(info['packageManager'], 'pnpm')
  })

  it('returns error for missing directory', () => {
    const info = getAppInfo('/tmp/nonexistent-rudderjs-test')
    assert.ok(info['error'])
  })
})

// ─── db_schema ────────────────────────────────────────────

describe('getDbSchema', () => {
  it('parses prisma schema from playground', () => {
    const schema = getDbSchema(PLAYGROUND)
    assert.ok(schema.models.length > 0)
    const user = schema.models.find(m => m.name === 'User')
    assert.ok(user, 'User model should exist')
    assert.ok(user.fields.some(f => f.name === 'email'))
  })

  it('returns raw schema content', () => {
    const schema = getDbSchema(PLAYGROUND)
    assert.ok(schema.raw)
    assert.ok(schema.raw.includes('model User'))
  })

  it('returns empty for missing schema', () => {
    const schema = getDbSchema('/tmp/nonexistent-rudderjs-test')
    assert.strictEqual(schema.models.length, 0)
  })
})

// ─── config_get ───────────────────────────────────────────

describe('getConfigValue', () => {
  it('lists config files when no key', () => {
    const result = getConfigValue(PLAYGROUND)
    assert.ok(typeof result === 'object')
    assert.ok(Array.isArray((result as Record<string, unknown>)['files']))
    assert.ok(((result as Record<string, unknown>)['files'] as string[]).includes('app'))
  })

  it('returns config file content for a key', () => {
    const result = getConfigValue(PLAYGROUND, 'app')
    assert.ok(typeof result === 'string')
    assert.ok(result.includes('APP_NAME') || result.includes('name'))
  })

  it('returns error for unknown key', () => {
    const result = getConfigValue(PLAYGROUND, 'nonexistent')
    assert.ok(typeof result === 'object')
    assert.ok((result as Record<string, unknown>)['error'])
  })
})

// ─── route_list ───────────────────────────────────────────

describe('getRouteList', () => {
  it('finds routes in playground', () => {
    const routes = getRouteList(PLAYGROUND)
    assert.ok(routes.length > 0)
    assert.ok(routes.some(r => r.path === '/api/health'))
  })

  it('detects HTTP methods', () => {
    const routes = getRouteList(PLAYGROUND)
    const methods = new Set(routes.map(r => r.method))
    assert.ok(methods.has('GET'))
    assert.ok(methods.has('POST'))
  })
})

// ─── model_list ───────────────────────────────────────────

describe('getModelList', () => {
  it('finds models in playground', () => {
    const models = getModelList(PLAYGROUND)
    assert.ok(models.length > 0)
    const user = models.find(m => m.name === 'User')
    assert.ok(user, 'User model should exist')
    assert.strictEqual(user.table, 'user')
    assert.ok(user.fields.length > 0)
  })
})

// ─── last_error ───────────────────────────────────────────

describe('getLastError', () => {
  it('returns message when no logs found', () => {
    const lines = getLastError('/tmp/nonexistent-rudderjs-test')
    assert.ok(lines[0]!.includes('No log files'))
  })
})

// ─── createBoostServer ───────────────────────────────────

describe('createBoostServer', () => {
  it('creates an MCP server', () => {
    const server = createBoostServer(PLAYGROUND)
    assert.ok(server)
  })
})

// ─── BoostProvider ───────────────────────────────────────

describe('BoostProvider', () => {
  it('is a constructor', () => {
    assert.strictEqual(typeof BoostProvider, 'function')
  })
})
