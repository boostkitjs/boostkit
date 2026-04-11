import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { defaultProviders, getLastLoadedProviderEntries } from './default-providers.js'

// These tests run against a temporary cwd so we can write a manifest without
// touching the real playground. The loader uses process.cwd() at call time.

const SCRATCH = path.join(process.cwd(), '.test-scratch-default-providers')
const ORIGINAL_CWD = process.cwd()

describe('defaultProviders()', () => {
  beforeEach(() => {
    mkdirSync(path.join(SCRATCH, 'bootstrap/cache'), { recursive: true })
    process.chdir(SCRATCH)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    if (existsSync(SCRATCH)) rmSync(SCRATCH, { recursive: true, force: true })
  })

  it('falls back to the built-in registry when no manifest exists', async () => {
    rmSync(path.join(SCRATCH, 'bootstrap/cache/providers.json'), { force: true })

    // Should return without throwing — packages are optional so missing peers are silent
    const providers = await defaultProviders()
    assert.ok(Array.isArray(providers))
  })

  it('honors the skip option', async () => {
    const manifest = {
      version: 2 as const,
      generated: new Date().toISOString(),
      providers: [
        { package: '@rudderjs/log',   provider: 'LogProvider',   stage: 'foundation' as const, optional: true },
        { package: '@rudderjs/cache', provider: 'CacheProvider', stage: 'infrastructure' as const, optional: true },
      ],
    }
    writeFileSync(path.join(SCRATCH, 'bootstrap/cache/providers.json'), JSON.stringify(manifest))

    await defaultProviders({ skip: ['@rudderjs/log'] })
    const loaded = getLastLoadedProviderEntries()

    // Skipped entries never appear in _lastLoadedEntries
    assert.ok(!loaded.some(e => e.package === '@rudderjs/log'))
  })

  it('skips entries with autoDiscover: false', async () => {
    const manifest = {
      version: 2 as const,
      generated: new Date().toISOString(),
      providers: [
        { package: '@rudderjs/cache', provider: 'CacheProvider', stage: 'infrastructure' as const, optional: true },
        { package: '@rudderjs/horizon', provider: 'HorizonProvider', stage: 'monitoring' as const, optional: true, autoDiscover: false },
      ],
    }
    writeFileSync(path.join(SCRATCH, 'bootstrap/cache/providers.json'), JSON.stringify(manifest))

    await defaultProviders()
    const loaded = getLastLoadedProviderEntries()

    assert.ok(!loaded.some(e => e.package === '@rudderjs/horizon'))
  })

  it('parses a valid manifest without throwing', async () => {
    const manifest = {
      version: 2 as const,
      generated: new Date().toISOString(),
      providers: [
        { package: '@rudderjs/log', provider: 'LogProvider', stage: 'foundation' as const, optional: true },
      ],
    }
    writeFileSync(path.join(SCRATCH, 'bootstrap/cache/providers.json'), JSON.stringify(manifest))

    await assert.doesNotReject(() => defaultProviders())
  })
})
