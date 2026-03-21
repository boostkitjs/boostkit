
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { Chart } from '../schema/Chart.js'

// ─── Chart schema element ──────────────────────────────────

describe('Chart schema element', () => {
  it('type is chart', () => {
    assert.equal(Chart.make('Revenue').getType(), 'chart')
  })

  it('defaults to line chart', () => {
    const meta = Chart.make('Revenue').toMeta()
    assert.equal(meta.type, 'chart')
    assert.equal(meta.title, 'Revenue')
    assert.equal(meta.chartType, 'line')
    assert.deepEqual(meta.labels, [])
    assert.deepEqual(meta.datasets, [])
  })

  it('fluent API sets chart type, labels, datasets', () => {
    const meta = Chart.make('Sales')
      .chartType('bar')
      .labels(['Jan', 'Feb', 'Mar'])
      .datasets([{ label: 'Revenue', data: [100, 200, 150] }])
      .toMeta()
    assert.equal(meta.chartType, 'bar')
    assert.deepEqual(meta.labels, ['Jan', 'Feb', 'Mar'])
    assert.equal(meta.datasets.length, 1)
    assert.equal(meta.datasets[0]!.label, 'Revenue')
  })

  it('supports pie and doughnut types', () => {
    assert.equal(Chart.make('X').chartType('pie').toMeta().chartType, 'pie')
    assert.equal(Chart.make('X').chartType('doughnut').toMeta().chartType, 'doughnut')
  })

  it('height defaults to 300', () => {
    assert.equal(Chart.make('X').toMeta().height, 300)
  })

  it('height is configurable', () => {
    assert.equal(Chart.make('X').height(400).toMeta().height, 400)
  })
})

// ─── Chart enhancements ───────────────────────────────────

describe('Chart enhancements', () => {
  it('id sets and getId auto-generates', () => {
    assert.equal(Chart.make('Revenue').getId(), 'revenue')
    assert.equal(Chart.make('Revenue').id('custom').getId(), 'custom')
  })

  it('description sets value', () => {
    const meta = Chart.make('Test').description('A chart').toMeta()
    assert.equal(meta.description, 'A chart')
  })

  it('lazy sets flag', () => {
    const c = Chart.make('Test').lazy()
    assert.equal(c.isLazy(), true)
    assert.equal(c.toMeta().lazy, true)
  })

  it('poll sets interval', () => {
    const c = Chart.make('Test').poll(5000)
    assert.equal(c.getPollInterval(), 5000)
    assert.equal(c.toMeta().pollInterval, 5000)
  })

  it('data stores function', () => {
    const fn = async () => ({ labels: [], datasets: [] })
    const c = Chart.make('Test').data(fn)
    assert.equal(c.getDataFn(), fn)
  })
})
