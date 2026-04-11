import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sortByStageAndDepends } from './provider-sort.js'
import type { ProviderEntry } from './provider-registry.js'

const e = (
  pkg: string,
  stage: ProviderEntry['stage'],
  depends?: string[],
): ProviderEntry => ({ package: pkg, provider: `${pkg}Provider`, stage, ...(depends && { depends }) })

describe('sortByStageAndDepends', () => {
  it('orders entries by stage: foundation → infrastructure → feature → monitoring', () => {
    const sorted = sortByStageAndDepends([
      e('horizon',   'monitoring'),
      e('queue',     'feature'),
      e('cache',     'infrastructure'),
      e('log',       'foundation'),
    ])

    assert.deepStrictEqual(
      sorted.map(p => p.package),
      ['log', 'cache', 'queue', 'horizon'],
    )
  })

  it('topo-sorts within a stage by depends', () => {
    const sorted = sortByStageAndDepends([
      e('auth',    'infrastructure', ['session', 'hash']),
      e('cache',   'infrastructure', ['log']),
      e('hash',    'infrastructure'),
      e('session', 'infrastructure'),
      e('log',     'foundation'),
    ])

    const order = sorted.map(p => p.package)
    // log first (foundation)
    assert.strictEqual(order[0], 'log')
    // auth must come after session AND hash
    assert.ok(order.indexOf('auth') > order.indexOf('session'))
    assert.ok(order.indexOf('auth') > order.indexOf('hash'))
  })

  it('tolerates cross-stage dependencies (stage order is enough)', () => {
    // queue (feature) depends on cache (infrastructure) — should not throw
    const sorted = sortByStageAndDepends([
      e('queue', 'feature',        ['cache']),
      e('cache', 'infrastructure'),
    ])
    assert.strictEqual(sorted[0]?.package, 'cache')
    assert.strictEqual(sorted[1]?.package, 'queue')
  })

  it('throws on a circular dependency with a clear cycle message', () => {
    assert.throws(
      () => sortByStageAndDepends([
        e('a', 'feature', ['b']),
        e('b', 'feature', ['c']),
        e('c', 'feature', ['a']),
      ]),
      /Circular provider dependency.*a.*b.*c.*a/,
    )
  })

  it('keeps unknown depends targets (resolved at load time, not sort time)', () => {
    // Depending on a package that isn't in the manifest is allowed —
    // it just won't constrain the order. The loader will skip missing peers.
    const sorted = sortByStageAndDepends([
      e('a', 'feature', ['ghost']),
      e('b', 'feature'),
    ])
    assert.strictEqual(sorted.length, 2)
  })

  it('returns an empty array for an empty input', () => {
    assert.deepStrictEqual(sortByStageAndDepends([]), [])
  })
})
