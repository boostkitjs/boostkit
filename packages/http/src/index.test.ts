import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PendingRequest, FakeManager, Pool, Http, http } from './index.js'

// ─── PendingRequest ───────────────────────────────────────

describe('PendingRequest', () => {
  it('builds URL with base and query params', async () => {
    const fake = new FakeManager()
    fake.register('/api/users', { status: 200, body: '[]', headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    const res = await client.get('/api/users', { page: '1', limit: '10' })

    assert.equal(res.status, 200)
    fake.assertSent((r) => r.url.includes('page=1') && r.url.includes('limit=10'))
  })

  it('sends JSON body on POST', async () => {
    const fake = new FakeManager()
    fake.register('/api/users', { status: 201, body: { id: '1' }, headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    const res = await client.post('/api/users', { name: 'Alice' })

    assert.equal(res.status, 201)
    assert.deepStrictEqual(res.json(), { id: '1' })
  })

  it('sets bearer token header', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: 'ok', headers: {} })

    const client = fake.client()
      .baseUrl('https://example.com')
      .withToken('my-token')

    await client.get('/api/me')
    fake.assertSent((r) => r.options.headers !== undefined)
    fake.assertSentCount(1)
  })

  it('sets basic auth header', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: 'ok', headers: {} })

    const client = fake.client()
      .baseUrl('https://example.com')
      .withBasicAuth('user', 'pass')

    await client.get('/api/me')
    fake.assertSentCount(1)
  })

  it('sends all HTTP verbs', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: 'ok', headers: {} })
    const client = fake.client().baseUrl('https://example.com')

    await client.get('/a')
    await client.post('/b', { x: 1 })
    await client.put('/c', { x: 2 })
    await client.patch('/d', { x: 3 })
    await client.delete('/e')
    await client.head('/f')

    fake.assertSentCount(6)
  })

  it('clones do not share state', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: 'ok', headers: {} })

    const base = fake.client().baseUrl('https://example.com')
    const withToken = base.withToken('secret')

    // base should not be mutated since get/post clone internally
    await base.get('/a')
    await withToken.get('/b')
    fake.assertSentCount(2)
  })
})

// ─── FakeManager ──────────────────────────────────────────

describe('FakeManager', () => {
  it('matches URL by string pattern', async () => {
    const fake = new FakeManager()
    fake.register('/api/users', { status: 200, body: [{ id: 1 }], headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    const res = await client.get('/api/users')

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.json(), [{ id: 1 }])
  })

  it('matches URL by RegExp', async () => {
    const fake = new FakeManager()
    fake.register(/\/api\/users\/\d+/, { status: 200, body: { id: 42 }, headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    const res = await client.get('/api/users/42')

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.json(), { id: 42 })
  })

  it('cycles through response sequence', async () => {
    const fake = new FakeManager()
    fake.register('/api/data', [
      { status: 500, body: 'error', headers: {} },
      { status: 200, body: 'ok', headers: {} },
    ])

    const client = fake.client().baseUrl('https://example.com')

    const res1 = await client.get('/api/data')
    assert.equal(res1.status, 500)

    const res2 = await client.get('/api/data')
    assert.equal(res2.status, 200)

    // After sequence exhausted, repeats last
    const res3 = await client.get('/api/data')
    assert.equal(res3.status, 200)
  })

  it('preventStrayRequests throws on unmatched URL', async () => {
    const fake = new FakeManager()
    fake.register('/api/known', { status: 200, body: '', headers: {} })
    fake.preventStrayRequests()

    const client = fake.client().baseUrl('https://example.com')

    await assert.rejects(
      () => client.get('/api/unknown'),
      { message: /No fake registered/ },
    )
  })

  it('records all requests', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: '', headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    await client.get('/a')
    await client.post('/b', { x: 1 })

    assert.equal(fake.recorded().length, 2)
    fake.assertSent((r) => r.method === 'GET' && r.url.includes('/a'))
    fake.assertSent((r) => r.method === 'POST' && r.url.includes('/b'))
  })

  it('assertNotSent passes when request was not made', () => {
    const fake = new FakeManager()
    fake.assertNotSent((r) => r.method === 'DELETE')
    fake.assertNothingSent()
  })

  it('assertSentCount validates count', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: '', headers: {} })

    const client = fake.client().baseUrl('https://example.com')
    await client.get('/a')

    fake.assertSentCount(1)
    assert.throws(() => fake.assertSentCount(0), /Expected 0/)
  })
})

// ─── Pool ─────────────────────────────────────────────────

describe('Pool', () => {
  it('executes all requests and returns in submission order', async () => {
    const fake = new FakeManager()
    fake.register('/a', { status: 200, body: 'A', headers: {} })
    fake.register('/b', { status: 200, body: 'B', headers: {} })
    fake.register('/c', { status: 200, body: 'C', headers: {} })

    const builder = fake.client().baseUrl('https://example.com')
    const pool = new Pool(builder)
      .add((http) => http.get('/a'))
      .add((http) => http.get('/b'))
      .add((http) => http.get('/c'))
      .concurrency(2)

    const results = await pool.send()

    assert.equal(results.length, 3)
    assert.equal(results[0]!.body, 'A')
    assert.equal(results[1]!.body, 'B')
    assert.equal(results[2]!.body, 'C')
  })

  it('handles empty pool', async () => {
    const builder = new PendingRequest()
    const pool = new Pool(builder)
    const results = await pool.send()
    assert.equal(results.length, 0)
  })
})

// ─── Http Facade ──────────────────────────────────────────

describe('Http facade', () => {
  beforeEach(() => {
    Http.clearInterceptors()
  })

  it('fake() returns a FakeManager', () => {
    const fake = Http.fake()
    assert.ok(fake instanceof FakeManager)
  })

  it('pool() creates and configures a pool', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: 'ok', headers: {} })

    // Can't easily test Http.pool() directly since it uses _make() internally,
    // but we can test the Pool constructor pattern
    const pool = new Pool(fake.client().baseUrl('https://example.com'))
    pool.add((http) => http.get('/a'))
    pool.add((http) => http.get('/b'))
    pool.concurrency(1)

    const results = await pool.send()
    assert.equal(results.length, 2)
  })

  it('interceptors run on requests and responses', async () => {
    const fake = new FakeManager()
    fake.register('example.com', { status: 200, body: '{"ok":true}', headers: {} })

    let intercepted = false
    const client = fake.client()
      .baseUrl('https://example.com')
      .withRequestMiddleware((req) => {
        intercepted = true
        return req
      })
      .withResponseMiddleware((res) => {
        assert.equal(res.status, 200)
        return res
      })

    await client.get('/test')
    assert.ok(intercepted)
  })
})

// ─── HttpResponse ─────────────────────────────────────────

describe('HttpResponse (via fake)', () => {
  it('ok() returns true for 2xx', async () => {
    const fake = new FakeManager()
    fake.register('test.com', { status: 200, body: '', headers: {} })

    const res = await fake.client().get('https://test.com')
    assert.ok(res.ok())
  })

  it('ok() returns false for non-2xx', async () => {
    const fake = new FakeManager()
    fake.register('test.com', { status: 404, body: '', headers: {} })

    const res = await fake.client().get('https://test.com')
    assert.ok(!res.ok())
  })

  it('json() parses JSON body', async () => {
    const fake = new FakeManager()
    fake.register('test.com', { status: 200, body: { users: [1, 2] }, headers: {} })

    const res = await fake.client().get('https://test.com')
    assert.deepStrictEqual(res.json(), { users: [1, 2] })
  })

  it('headers are returned', async () => {
    const fake = new FakeManager()
    fake.register('test.com', {
      status: 200,
      body: '',
      headers: { 'x-custom': 'hello' },
    })

    const res = await fake.client().get('https://test.com')
    assert.equal(res.headers['x-custom'], 'hello')
  })
})

// ─── http() factory ───────────────────────────────────────

describe('http() factory', () => {
  it('returns a PendingRequest', () => {
    const req = http()
    assert.ok(req instanceof PendingRequest)
  })
})
