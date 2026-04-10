import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TestResponse } from './TestResponse.js'

// ─── TestResponse: Status assertions ──────────────────────

describe('TestResponse — status assertions', () => {
  it('assertOk passes for 200', () => {
    const res = new TestResponse(200, {}, {}, '{}')
    res.assertOk()
  })

  it('assertOk throws for non-200', () => {
    const res = new TestResponse(404, {}, {}, '')
    assert.throws(() => res.assertOk(), /Expected status 200/)
  })

  it('assertCreated passes for 201', () => {
    new TestResponse(201, {}, {}, '').assertCreated()
  })

  it('assertNoContent passes for 204', () => {
    new TestResponse(204, {}, null, '').assertNoContent()
  })

  it('assertNotFound passes for 404', () => {
    new TestResponse(404, {}, {}, '').assertNotFound()
  })

  it('assertForbidden passes for 403', () => {
    new TestResponse(403, {}, {}, '').assertForbidden()
  })

  it('assertUnauthorized passes for 401', () => {
    new TestResponse(401, {}, {}, '').assertUnauthorized()
  })

  it('assertUnprocessable passes for 422', () => {
    new TestResponse(422, {}, {}, '').assertUnprocessable()
  })

  it('assertSuccessful passes for 2xx range', () => {
    new TestResponse(200, {}, {}, '').assertSuccessful()
    new TestResponse(201, {}, {}, '').assertSuccessful()
    new TestResponse(204, {}, {}, '').assertSuccessful()
  })

  it('assertSuccessful throws for non-2xx', () => {
    assert.throws(() => new TestResponse(400, {}, {}, '').assertSuccessful(), /Expected successful/)
  })

  it('assertServerError passes for 5xx', () => {
    new TestResponse(500, {}, {}, '').assertServerError()
    new TestResponse(503, {}, {}, '').assertServerError()
  })

  it('assertServerError throws for non-5xx', () => {
    assert.throws(() => new TestResponse(200, {}, {}, '').assertServerError(), /Expected server error/)
  })

  it('assertStatus passes for exact match', () => {
    new TestResponse(302, {}, null, '').assertStatus(302)
  })

  it('assertStatus throws for mismatch', () => {
    assert.throws(() => new TestResponse(200, {}, {}, '').assertStatus(201), /Expected status 201/)
  })
})

// ─── TestResponse: JSON assertions ────────────────────────

describe('TestResponse — JSON assertions', () => {
  const body = { name: 'Alice', age: 30, tags: ['admin'] }
  const makeRes = () => new TestResponse(200, {}, body, JSON.stringify(body))

  it('assertJson partial matches', () => {
    makeRes().assertJson({ name: 'Alice' })
  })

  it('assertJson throws on mismatch', () => {
    assert.throws(() => makeRes().assertJson({ name: 'Bob' }), /does not match/)
  })

  it('assertJsonPath matches dot-separated paths', () => {
    const nested = { data: { users: [{ name: 'Alice' }] } }
    const res = new TestResponse(200, {}, nested, JSON.stringify(nested))
    res.assertJsonPath('data.users.0.name', 'Alice')
  })

  it('assertJsonCount checks array length', () => {
    const data = { items: [1, 2, 3] }
    const res = new TestResponse(200, {}, data, JSON.stringify(data))
    res.assertJsonCount(3, 'items')
  })

  it('assertJsonCount at root', () => {
    const data = [1, 2]
    const res = new TestResponse(200, {}, data, JSON.stringify(data))
    res.assertJsonCount(2)
  })

  it('assertJsonStructure checks keys exist', () => {
    makeRes().assertJsonStructure(['name', 'age', 'tags'])
  })

  it('assertJsonStructure throws for missing keys', () => {
    assert.throws(() => makeRes().assertJsonStructure(['missing']), /Expected JSON to have key/)
  })

  it('assertJsonMissing passes when key absent', () => {
    makeRes().assertJsonMissing({ email: 'alice@test.com' })
  })

  it('assertJsonMissing throws when value matches', () => {
    assert.throws(() => makeRes().assertJsonMissing({ name: 'Alice' }), /should not match/)
  })
})

// ─── TestResponse: Header assertions ──────────────────────

describe('TestResponse — header assertions', () => {
  const headers = { 'content-type': 'application/json', 'x-request-id': 'abc123' }
  const makeRes = () => new TestResponse(200, headers, {}, '{}')

  it('assertHeader passes when present', () => {
    makeRes().assertHeader('content-type')
  })

  it('assertHeader with value check', () => {
    makeRes().assertHeader('content-type', 'json')
  })

  it('assertHeader throws when absent', () => {
    assert.throws(() => makeRes().assertHeader('x-missing'), /to be present/)
  })

  it('assertHeaderMissing passes when absent', () => {
    makeRes().assertHeaderMissing('x-missing')
  })

  it('assertHeaderMissing throws when present', () => {
    assert.throws(() => makeRes().assertHeaderMissing('content-type'), /to be absent/)
  })
})

// ─── TestResponse: Redirect assertions ────────────────────

describe('TestResponse — redirect assertions', () => {
  it('assertRedirect passes for 3xx with location', () => {
    const res = new TestResponse(302, { location: '/dashboard' }, null, '')
    res.assertRedirect('/dashboard')
  })

  it('assertRedirect without location check', () => {
    const res = new TestResponse(301, { location: '/new' }, null, '')
    res.assertRedirect()
  })

  it('assertRedirect throws for non-3xx', () => {
    const res = new TestResponse(200, {}, {}, '')
    assert.throws(() => res.assertRedirect(), /Expected redirect/)
  })
})

// ─── TestResponse: chaining ───────────────────────────────

describe('TestResponse — chaining', () => {
  it('assertions return this for chaining', () => {
    const res = new TestResponse(200, { 'x-id': '1' }, { ok: true }, '{"ok":true}')
    const result = res
      .assertOk()
      .assertSuccessful()
      .assertStatus(200)
      .assertJson({ ok: true })
      .assertHeader('x-id', '1')
      .assertJsonStructure(['ok'])

    assert.strictEqual(result, res)
  })
})

// ─── TestResponse: text() and json() ──────────────────────

describe('TestResponse — accessors', () => {
  it('text() returns raw response text', () => {
    const res = new TestResponse(200, {}, {}, 'raw text')
    assert.equal(res.text(), 'raw text')
  })

  it('json() returns parsed body', () => {
    const body = { a: 1 }
    const res = new TestResponse(200, {}, body, '{"a":1}')
    assert.deepStrictEqual(res.json(), { a: 1 })
  })
})
