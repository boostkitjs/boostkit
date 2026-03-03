import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { cache, Cache, CacheRegistry, type CacheAdapter } from './index.js'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('Cache contract baseline', () => {
  beforeEach(async () => {
    ;(CacheRegistry as unknown as { adapter: CacheAdapter | null }).adapter = null

    const Provider = cache({ default: 'memory', stores: { memory: { driver: 'memory' } } })
    const app = { instance: () => undefined }
    const provider = new Provider(app as never)
    await provider.boot()
    await Cache.flush()
  })

  it('memory cache supports get/set/forget/has', async () => {
    await Cache.set('user:1', { id: 1 })

    assert.deepStrictEqual(await Cache.get('user:1'), { id: 1 })
    assert.strictEqual(await Cache.has('user:1'), true)

    await Cache.forget('user:1')

    assert.strictEqual(await Cache.has('user:1'), false)
    assert.strictEqual(await Cache.get('user:1'), null)
  })

  it('remember() computes once and returns cached value within TTL', async () => {
    let calls = 0

    const a = await Cache.remember('remember:key', 60, async () => {
      calls++
      return 'value'
    })
    const b = await Cache.remember('remember:key', 60, async () => {
      calls++
      return 'new-value'
    })

    assert.strictEqual(a, 'value')
    assert.strictEqual(b, 'value')
    assert.strictEqual(calls, 1)
  })

  it('stored value expires after TTL', async () => {
    await Cache.set('ttl:key', 'ephemeral', 0.01)
    assert.strictEqual(await Cache.get('ttl:key'), 'ephemeral')

    await sleep(25)

    assert.strictEqual(await Cache.get('ttl:key'), null)
    assert.strictEqual(await Cache.has('ttl:key'), false)
  })
})
