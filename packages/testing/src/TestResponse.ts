import assert from 'node:assert/strict'

/**
 * Wraps an HTTP response with fluent assertion methods.
 *
 * @example
 * const response = await t.get('/api/users')
 * response.assertOk()
 * response.assertJson({ name: 'John' })
 * response.assertJsonPath('data.0.email', 'john@test.com')
 */
export class TestResponse {
  readonly status: number
  readonly headers: Record<string, string>
  readonly body: unknown
  private _text: string

  constructor(status: number, headers: Record<string, string>, body: unknown, text: string) {
    this.status  = status
    this.headers = headers
    this.body    = body
    this._text   = text
  }

  /** Raw response text. */
  text(): string { return this._text }

  /** Parsed JSON body (same as .body). */
  json(): unknown { return this.body }

  // ─── Status assertions ──────────────────────────────────

  assertStatus(expected: number): this {
    assert.equal(this.status, expected, `Expected status ${expected}, got ${this.status}`)
    return this
  }

  assertOk(): this { return this.assertStatus(200) }
  assertCreated(): this { return this.assertStatus(201) }
  assertNoContent(): this { return this.assertStatus(204) }
  assertNotFound(): this { return this.assertStatus(404) }
  assertForbidden(): this { return this.assertStatus(403) }
  assertUnauthorized(): this { return this.assertStatus(401) }
  assertUnprocessable(): this { return this.assertStatus(422) }

  assertSuccessful(): this {
    assert.ok(this.status >= 200 && this.status < 300, `Expected successful status (2xx), got ${this.status}`)
    return this
  }

  assertServerError(): this {
    assert.ok(this.status >= 500, `Expected server error (5xx), got ${this.status}`)
    return this
  }

  // ─── JSON assertions ───────────────────────────────────

  /** Assert response JSON contains the given key-value pairs (partial match). */
  assertJson(expected: Record<string, unknown>): this {
    const body = this.body as Record<string, unknown>
    for (const [key, value] of Object.entries(expected)) {
      assert.deepStrictEqual(body[key], value, `JSON key "${key}" does not match`)
    }
    return this
  }

  /** Assert a value at a dot-separated JSON path. */
  assertJsonPath(path: string, expected: unknown): this {
    const actual = getPath(this.body, path)
    assert.deepStrictEqual(actual, expected, `JSON path "${path}" does not match`)
    return this
  }

  /** Assert an array at the given JSON path has the expected length. */
  assertJsonCount(count: number, path?: string): this {
    const target = path ? getPath(this.body, path) : this.body
    assert.ok(Array.isArray(target), `Expected array at ${path ?? 'root'}, got ${typeof target}`)
    assert.equal(target.length, count, `Expected ${count} items at "${path ?? 'root'}", got ${target.length}`)
    return this
  }

  /** Assert response JSON has the given top-level keys. */
  assertJsonStructure(keys: string[]): this {
    const body = this.body as Record<string, unknown>
    for (const key of keys) {
      assert.ok(key in body, `Expected JSON to have key "${key}"`)
    }
    return this
  }

  /** Assert response JSON does NOT contain the given key-value pairs. */
  assertJsonMissing(data: Record<string, unknown>): this {
    const body = this.body as Record<string, unknown>
    for (const [key, value] of Object.entries(data)) {
      if (key in body) {
        assert.notDeepStrictEqual(body[key], value, `JSON key "${key}" should not match the given value`)
      }
    }
    return this
  }

  // ─── Header assertions ─────────────────────────────────

  assertHeader(name: string, value?: string): this {
    const actual = this.headers[name.toLowerCase()]
    assert.ok(actual !== undefined, `Expected header "${name}" to be present`)
    if (value !== undefined) {
      assert.ok(actual.includes(value), `Expected header "${name}" to contain "${value}", got "${actual}"`)
    }
    return this
  }

  assertHeaderMissing(name: string): this {
    assert.equal(this.headers[name.toLowerCase()], undefined, `Expected header "${name}" to be absent`)
    return this
  }

  // ─── Redirect assertions ───────────────────────────────

  assertRedirect(location?: string): this {
    assert.ok(
      this.status >= 300 && this.status < 400,
      `Expected redirect status (3xx), got ${this.status}`,
    )
    if (location) {
      const actual = this.headers['location']
      assert.ok(actual?.includes(location), `Expected redirect to "${location}", got "${actual}"`)
    }
    return this
  }
}

// ─── Helpers ──────────────────────────────────────────────

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}
