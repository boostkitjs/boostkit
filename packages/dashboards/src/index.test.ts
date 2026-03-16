import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { Widget } from './Widget.js'
import { DashboardRegistry } from './DashboardRegistry.js'
import { dashboard, buildDefaultLayout } from './DashboardServiceProvider.js'

// ─── Widget ───────────────────────────────────────────────

describe('Widget', () => {
  it('creates with id', () => {
    const w = Widget.make('total-users')
    assert.equal(w.getId(), 'total-users')
  })

  it('label is settable', () => {
    assert.equal(Widget.make('x').label('Total Users').getLabel(), 'Total Users')
  })

  it('default size is medium', () => {
    assert.equal(Widget.make('x').getDefaultSize(), 'medium')
  })

  it('size is configurable', () => {
    assert.equal(Widget.make('x').defaultSize('small').getDefaultSize(), 'small')
    assert.equal(Widget.make('x').defaultSize('large').getDefaultSize(), 'large')
  })

  it('component defaults to stat', () => {
    assert.equal(Widget.make('x').getComponent(), 'stat')
  })

  it('component is configurable', () => {
    assert.equal(Widget.make('x').component('chart').getComponent(), 'chart')
  })

  it('description is optional', () => {
    const meta = Widget.make('x').toMeta()
    assert.equal(meta.description, undefined)
  })

  it('icon is optional', () => {
    const meta = Widget.make('x').toMeta()
    assert.equal(meta.icon, undefined)
  })

  it('toMeta() returns full registration info', () => {
    const meta = Widget.make('revenue')
      .label('Revenue')
      .defaultSize('large')
      .component('chart')
      .description('Monthly revenue chart')
      .icon('chart-line')
      .toMeta()

    assert.equal(meta.id, 'revenue')
    assert.equal(meta.label, 'Revenue')
    assert.equal(meta.defaultSize, 'large')
    assert.equal(meta.component, 'chart')
    assert.equal(meta.description, 'Monthly revenue chart')
    assert.equal(meta.icon, 'chart-line')
  })

  it('data function is stored', () => {
    const fn = async () => ({ value: 42 })
    const w = Widget.make('x').data(fn)
    assert.equal(w.getDataFn(), fn)
  })

  it('data function is optional', () => {
    assert.equal(Widget.make('x').getDataFn(), undefined)
  })

  it('fluent API is chainable', () => {
    const w = Widget.make('x')
      .label('Test')
      .defaultSize('small')
      .component('list')
      .description('Desc')
      .icon('star')
    assert.equal(w.getId(), 'x')
    assert.equal(w.getLabel(), 'Test')
    assert.equal(w.getDefaultSize(), 'small')
    assert.equal(w.getComponent(), 'list')
  })
})

// ─── DashboardRegistry ────────────────────────────────────

describe('DashboardRegistry', () => {
  beforeEach(() => {
    DashboardRegistry.reset()
  })

  it('starts empty', () => {
    assert.equal(DashboardRegistry.all().length, 0)
  })

  it('register and get', () => {
    const w = Widget.make('users').label('Users')
    DashboardRegistry.register(w)
    assert.equal(DashboardRegistry.get('users'), w)
  })

  it('get returns undefined for unknown id', () => {
    assert.equal(DashboardRegistry.get('nope'), undefined)
  })

  it('has() returns true for registered widget', () => {
    DashboardRegistry.register(Widget.make('x'))
    assert.equal(DashboardRegistry.has('x'), true)
    assert.equal(DashboardRegistry.has('y'), false)
  })

  it('all() returns all registered widgets', () => {
    DashboardRegistry.register(Widget.make('a'))
    DashboardRegistry.register(Widget.make('b'))
    assert.equal(DashboardRegistry.all().length, 2)
  })

  it('overwrites widget with same id', () => {
    DashboardRegistry.register(Widget.make('x').label('Old'))
    DashboardRegistry.register(Widget.make('x').label('New'))
    assert.equal(DashboardRegistry.all().length, 1)
    assert.equal(DashboardRegistry.get('x')?.getLabel(), 'New')
  })

  it('reset() clears all', () => {
    DashboardRegistry.register(Widget.make('x'))
    DashboardRegistry.reset()
    assert.equal(DashboardRegistry.all().length, 0)
  })
})

// ─── dashboard() factory ──────────────────────────────────

describe('dashboard() factory', () => {
  beforeEach(() => {
    DashboardRegistry.reset()
  })

  it('returns a ServiceProvider class (constructor)', () => {
    const Provider = dashboard({ widgets: [] })
    assert.equal(typeof Provider, 'function')
    assert.equal(typeof Provider.prototype.register, 'function')
  })

  it('register() populates DashboardRegistry', () => {
    const Provider = dashboard({
      widgets: [
        Widget.make('a').label('A'),
        Widget.make('b').label('B'),
      ],
    })
    // Instantiate with a fake app
    const provider = new Provider({} as any)
    provider.register()
    assert.equal(DashboardRegistry.all().length, 2)
    assert.equal(DashboardRegistry.get('a')?.getLabel(), 'A')
    assert.equal(DashboardRegistry.get('b')?.getLabel(), 'B')
  })

  it('register() resets previous widgets', () => {
    DashboardRegistry.register(Widget.make('old'))
    const Provider = dashboard({ widgets: [Widget.make('new')] })
    const provider = new Provider({} as any)
    provider.register()
    assert.equal(DashboardRegistry.all().length, 1)
    assert.equal(DashboardRegistry.has('old'), false)
    assert.equal(DashboardRegistry.has('new'), true)
  })

  it('boot() does not throw when no widgets', async () => {
    const Provider = dashboard({ widgets: [] })
    const provider = new Provider({} as any)
    provider.register()
    // boot() is now async — should resolve without error (no panels loaded)
    await assert.doesNotReject(() => provider.boot!() as Promise<void>)
  })

  it('boot() does not throw when panels not available', async () => {
    const Provider = dashboard({
      widgets: [Widget.make('x').label('X')],
    })
    const provider = new Provider({} as any)
    provider.register()
    // panels peer dep not loaded — should silently return
    await assert.doesNotReject(() => provider.boot!() as Promise<void>)
  })
})

// ─── buildDefaultLayout ──────────────────────────────────

describe('buildDefaultLayout', () => {
  it('generates layout entries from widgets', () => {
    const widgets = [
      Widget.make('a').label('A').defaultSize('small'),
      Widget.make('b').label('B').defaultSize('large'),
      Widget.make('c').label('C'),
    ]
    const layout = buildDefaultLayout(widgets)

    assert.equal(layout.length, 3)
    assert.equal(layout[0]!.widgetId, 'a')
    assert.equal(layout[0]!.size, 'small')
    assert.equal(layout[0]!.position, 0)
    assert.equal(layout[1]!.widgetId, 'b')
    assert.equal(layout[1]!.size, 'large')
    assert.equal(layout[1]!.position, 1)
    assert.equal(layout[2]!.widgetId, 'c')
    assert.equal(layout[2]!.size, 'medium')
    assert.equal(layout[2]!.position, 2)
  })

  it('returns empty array for no widgets', () => {
    const layout = buildDefaultLayout([])
    assert.deepStrictEqual(layout, [])
  })
})
