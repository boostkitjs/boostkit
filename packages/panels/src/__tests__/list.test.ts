
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { List } from '../schema/List.js'

// ─── List schema element ──────────────────────────────────

describe('List schema element', () => {
  it('type is list', () => {
    assert.equal(List.make('Recent Activity').getType(), 'list')
  })

  it('static items', () => {
    const meta = List.make('Links')
      .items([
        { label: 'Docs', description: 'Read the docs', href: '/docs' },
        { label: 'Blog', description: 'Latest posts' },
      ])
      .toMeta()
    assert.equal(meta.items.length, 2)
    assert.equal(meta.items[0]!.label, 'Docs')
    assert.equal(meta.items[0]!.href, '/docs')
    assert.equal(meta.items[1]!.href, undefined)
  })

  it('limit defaults to 5', () => {
    assert.equal(List.make('X').toMeta().limit, 5)
  })

  it('limit is configurable', () => {
    assert.equal(List.make('X').limit(10).toMeta().limit, 10)
  })

  it('items are truncated to limit', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ label: `Item ${i}` }))
    const meta = List.make('X').items(items).limit(3).toMeta()
    assert.equal(meta.items.length, 3)
    assert.equal(meta.items[0]!.label, 'Item 0')
    assert.equal(meta.items[2]!.label, 'Item 2')
  })
})

// ─── List enhancements ────────────────────────────────────

describe('List enhancements', () => {
  it('id and getId', () => {
    assert.equal(List.make('Links').getId(), 'links')
    assert.equal(List.make('Links').id('custom').getId(), 'custom')
  })

  it('description', () => {
    const meta = List.make('Test').description('A list').items([]).toMeta()
    assert.equal(meta.description, 'A list')
  })

  it('lazy', () => {
    assert.equal(List.make('Test').lazy().isLazy(), true)
  })

  it('poll', () => {
    assert.equal(List.make('Test').poll(3000).getPollInterval(), 3000)
  })

  it('data stores function', () => {
    const fn = async () => [{ label: 'x' }]
    assert.equal(List.make('Test').data(fn).getDataFn(), fn)
  })
})
