
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { Stats, Stat } from '../schema/Stats.js'

// ─── Stat ────────────────────────────────────────────────────

describe('Stat', () => {
  it('toMeta returns label and value', () => {
    const m = Stat.make('Users').value(42).toMeta()
    assert.equal(m.label, 'Users')
    assert.equal(m.value, 42)
  })

  it('description is optional', () => {
    const m = Stat.make('Users').value(0).toMeta()
    assert.equal('description' in m, false)
  })

  it('includes description when set', () => {
    const m = Stat.make('Users').value(10).description('Active users').toMeta()
    assert.equal(m.description, 'Active users')
  })

  it('includes trend when set', () => {
    const m = Stat.make('Revenue').value(100).trend(5).toMeta()
    assert.equal(m.trend, 5)
  })
})

// ─── Stats ───────────────────────────────────────────────────

describe('Stats', () => {
  it('type is stats', () => {
    assert.equal(Stats.make([]).getType(), 'stats')
  })

  it('toMeta maps stats to meta', () => {
    const m = Stats.make([Stat.make('A').value(1), Stat.make('B').value(2)]).toMeta()
    assert.equal(m.type, 'stats')
    assert.equal(m.stats.length, 2)
    assert.equal(m.stats[0]!.label, 'A')
    assert.equal(m.stats[1]!.label, 'B')
  })
})

// ─── Stats enhancements ─────────────────────────────────────

describe('Stats enhancements', () => {
  it('Stats.make(Stat[]) backwards compatible', () => {
    const s = Stats.make([Stat.make('Users').value(42)])
    assert.equal(s.getStats().length, 1)
    assert.equal(s.getStats()[0]!.toMeta().label, 'Users')
    assert.equal(s.getStats()[0]!.toMeta().value, 42)
  })

  it('Stats.make(string) sets id for async mode', () => {
    const s = Stats.make('my-stats')
    assert.equal(s.getId(), 'my-stats')
  })

  it('data() stores data function', () => {
    const fn = async () => [{ label: 'X', value: 1 }]
    const s = Stats.make('s').data(fn)
    assert.equal(s.getDataFn(), fn)
  })

  it('lazy() sets lazy', () => {
    const s = Stats.make('s').lazy()
    assert.equal(s.isLazy(), true)
  })

  it('poll() stores poll interval', () => {
    const s = Stats.make('s').poll(10000)
    assert.equal(s.getPollInterval(), 10000)
  })

  it('getId() auto-generates from stat labels when no id set', () => {
    const s = Stats.make([Stat.make('Users').value(1), Stat.make('Posts').value(2)])
    const id = s.getId()
    assert.ok(id.includes('users'))
    assert.ok(id.includes('posts'))
  })

  it('toMeta() includes id when set', () => {
    const meta = Stats.make('dash-stats').toMeta()
    assert.equal(meta.id, 'dash-stats')
  })

  it('toMeta() includes lazy when set', () => {
    const meta = Stats.make('s').lazy().toMeta()
    assert.equal(meta.lazy, true)
  })

  it('toMeta() includes pollInterval when set', () => {
    const meta = Stats.make('s').poll(5000).toMeta()
    assert.equal(meta.pollInterval, 5000)
  })

  it('toMeta() omits id/lazy/pollInterval when not set (static mode)', () => {
    const meta = Stats.make([Stat.make('X').value(1)]).toMeta()
    assert.equal(meta.id, undefined)
    assert.equal(meta.lazy, undefined)
    assert.equal(meta.pollInterval, undefined)
  })
})
