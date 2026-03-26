
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { TextField }    from '../schema/fields/TextField.js'
import { EmailField }   from '../schema/fields/EmailField.js'
import { NumberField }  from '../schema/fields/NumberField.js'
import { BooleanField } from '../schema/fields/BooleanField.js'

// ─── Field ──────────────────────────────────────────────────

describe('Field', () => {
  it('auto-labels from camelCase name', () => {
    const f = TextField.make('firstName')
    assert.equal(f.getLabel(), 'First Name')
  })

  it('respects explicit label', () => {
    const f = TextField.make('n').label('Custom Label')
    assert.equal(f.getLabel(), 'Custom Label')
  })

  it('required defaults to false', () => {
    assert.equal(TextField.make('x').isRequired(), false)
  })

  it('required() sets to true', () => {
    assert.equal(TextField.make('x').required().isRequired(), true)
  })

  it('readonly() hides from create and edit', () => {
    const f = TextField.make('x').readonly()
    assert.equal(f.isReadonly(), true)
    assert.equal(f.isHiddenFrom('create'), true)
    assert.equal(f.isHiddenFrom('edit'), true)
    assert.equal(f.isHiddenFrom('table'), false)
  })

  it('sortable() sets flag', () => {
    assert.equal(TextField.make('x').sortable().isSortable(), true)
  })

  it('searchable() sets flag', () => {
    assert.equal(TextField.make('x').searchable().isSearchable(), true)
  })

  it('hideFrom() adds to hidden set', () => {
    const f = TextField.make('x').hideFrom('table', 'create')
    assert.equal(f.isHiddenFrom('table'), true)
    assert.equal(f.isHiddenFrom('create'), true)
    assert.equal(f.isHiddenFrom('edit'), false)
  })

  it('hideFromTable/Create/Edit() shortcuts work', () => {
    const f = TextField.make('x').hideFromTable().hideFromCreate().hideFromEdit()
    assert.equal(f.isHiddenFrom('table'), true)
    assert.equal(f.isHiddenFrom('create'), true)
    assert.equal(f.isHiddenFrom('edit'), true)
  })

  it('toMeta() returns correct shape', () => {
    const meta = TextField.make('title').required().sortable().toMeta()
    assert.equal(meta.name, 'title')
    assert.equal(meta.type, 'text')
    assert.equal(meta.label, 'Title')
    assert.equal(meta.required, true)
    assert.equal(meta.sortable, true)
    assert.equal(meta.searchable, undefined)
    assert.equal(meta.hidden, undefined)
  })

  it('component() stores a key on meta', () => {
    const f = TextField.make('color').component('color-picker')
    assert.equal(f.toMeta().component, 'color-picker')
  })

  it('component is undefined by default', () => {
    const f = TextField.make('x')
    assert.equal(f.toMeta().component, undefined)
  })
})

// ─── conditional fields ──────────────────────────────────────

describe('conditional fields', () => {
  it('showWhen equality condition', () => {
    const f = TextField.make('x').showWhen('status', 'published')
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'show', field: 'status', op: '=', value: 'published' },
    ])
  })

  it('showWhen with explicit operator', () => {
    const f = TextField.make('x').showWhen('views', '>', 100)
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'show', field: 'views', op: '>', value: 100 },
    ])
  })

  it('showWhen with array uses "in"', () => {
    const f = TextField.make('x').showWhen('status', ['draft', 'review'])
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'show', field: 'status', op: 'in', value: ['draft', 'review'] },
    ])
  })

  it('hideWhen stores hide condition', () => {
    const f = TextField.make('x').hideWhen('featured', true)
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'hide', field: 'featured', op: '=', value: true },
    ])
  })

  it('disabledWhen stores disabled condition', () => {
    const f = TextField.make('x').disabledWhen('verified', true)
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'disabled', field: 'verified', op: '=', value: true },
    ])
  })

  it('truthy/falsy operators', () => {
    const f = TextField.make('x').showWhen('name', 'truthy')
    assert.deepEqual(f.toMeta().conditions, [
      { type: 'show', field: 'name', op: 'truthy', value: null },
    ])
  })

  it('no conditions → conditions absent from meta', () => {
    assert.equal(TextField.make('x').toMeta().conditions, undefined)
  })

  it('multiple conditions stack', () => {
    const f = TextField.make('x').showWhen('a', '1').hideWhen('b', '2')
    assert.equal(f.toMeta().conditions?.length, 2)
  })
})

// ─── Display transformer ─────────────────────────────────────

describe('display transformer', () => {
  it('display() sets displayTransformed in meta', () => {
    const f = NumberField.make('price').display((v) => `$${v}`)
    assert.equal(f.toMeta().displayTransformed, true)
  })

  it('displayTransformed absent without display()', () => {
    assert.equal(NumberField.make('price').toMeta().displayTransformed, undefined)
  })

  it('applyDisplay transforms value', () => {
    const f = NumberField.make('price').display((v) => `$${((v as number) / 100).toFixed(2)}`)
    assert.equal(f.applyDisplay(1999, {}), '$19.99')
  })

  it('applyDisplay receives the full record', () => {
    const f = TextField.make('title').display((v, r) => `${v} (${(r as any).status})`)
    assert.equal(f.applyDisplay('Hello', { status: 'draft' }), 'Hello (draft)')
  })
})

// ─── Per-field validation ────────────────────────────────────

describe('per-field validation', () => {
  it('validate() async validator returning true passes', async () => {
    const f = TextField.make('slug')
      .validate(async (value) => value ? true : 'Slug is required')
    assert.equal(await f.runValidate('hello', {}), true)
  })

  it('validate() returns error string when invalid', async () => {
    const f = TextField.make('slug')
      .validate(async (value) => value ? true : 'Slug is required')
    assert.equal(await f.runValidate('', {}), 'Slug is required')
  })

  it('validate() receives full form data', async () => {
    const f = TextField.make('endDate')
      .validate(async (value, data) => {
        if ((value as string) < (data as any).startDate) return 'End must be after start'
        return true
      })
    const result = await f.runValidate('2020-01-01', { startDate: '2021-01-01' })
    assert.equal(result, 'End must be after start')
  })

  it('without validate(), runValidate returns true', async () => {
    const f = TextField.make('x')
    assert.equal(await f.runValidate('anything', {}), true)
  })
})

// ─── Field-level access control ─────────────────────────────

describe('field-level access control', () => {
  it('readableBy stores function — not in meta', () => {
    const fn = (ctx: any) => ctx.user?.role === 'admin'
    const f = TextField.make('x').readableBy(fn)
    assert.equal(f.toMeta().extra?.['readableBy'], undefined)
    assert.ok(f.canRead({ user: { role: 'admin' } }))
    assert.equal(f.canRead({ user: { role: 'user' } }), false)
  })

  it('editableBy stores function — not in meta', () => {
    const f = TextField.make('x').editableBy((ctx: any) => ctx.user?.role === 'admin')
    assert.ok(f.canEdit({ user: { role: 'admin' } }))
    assert.equal(f.canEdit({ user: { role: 'user' } }), false)
  })

  it('without readableBy, canRead returns true', () => {
    assert.ok(TextField.make('x').canRead({}))
  })

  it('without editableBy, canEdit returns true', () => {
    assert.ok(TextField.make('x').canEdit({}))
  })
})

// ─── Field — persist() ──────────────────────────────────────

describe('Field — persist()', () => {
  it('defaults to no persist', () => {
    const f = TextField.make('title')
    assert.equal(f.isPersist(), false)
    assert.equal(f.getPersistMode(), false)
    assert.equal(f.isYjs(), false)
    assert.deepEqual(f.getYjsProviders(), [])
  })

  it('.persist() sets localStorage mode', () => {
    const f = TextField.make('title').persist()
    assert.equal(f.isPersist(), true)
    assert.equal(f.getPersistMode(), 'localStorage')
    assert.equal(f.isYjs(), false)
    assert.deepEqual(f.getYjsProviders(), [])
  })

  it('.persist() in toMeta()', () => {
    const meta = TextField.make('title').persist().toMeta()
    assert.equal(meta.persist, 'localStorage')
    assert.equal(meta.yjs, undefined)
    assert.equal(meta.yjsProviders, undefined)
  })

  it('.persist("indexeddb") sets yjs + indexeddb provider', () => {
    const f = TextField.make('title').persist('indexeddb')
    assert.equal(f.isPersist(), true)
    assert.deepEqual(f.getPersistMode(), ['indexeddb'])
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['indexeddb'])
  })

  it('.persist("indexeddb") in toMeta()', () => {
    const meta = TextField.make('title').persist('indexeddb').toMeta()
    assert.deepEqual(meta.persist, ['indexeddb'])
    assert.equal(meta.yjs, true)
    assert.deepEqual(meta.yjsProviders, ['indexeddb'])
  })

  it('.persist("websocket") sets yjs + websocket provider', () => {
    const f = TextField.make('title').persist('websocket')
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['websocket'])
    assert.deepEqual(f.getPersistMode(), ['websocket'])
  })

  it('.persist(["websocket", "indexeddb"]) sets both providers', () => {
    const f = TextField.make('title').persist(['websocket', 'indexeddb'])
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['websocket', 'indexeddb'])
    assert.deepEqual(f.getPersistMode(), ['websocket', 'indexeddb'])
  })

  it('.persist(["websocket", "indexeddb"]) in toMeta()', () => {
    const meta = TextField.make('title').persist(['websocket', 'indexeddb']).toMeta()
    assert.deepEqual(meta.persist, ['websocket', 'indexeddb'])
    assert.equal(meta.yjs, true)
    assert.deepEqual(meta.yjsProviders, ['websocket', 'indexeddb'])
  })

  it('.collaborative() is shorthand for websocket yjs', () => {
    const f = TextField.make('title').collaborative()
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['websocket'])
    // persist mode is not set — .collaborative() is not .persist()
    assert.equal(f.getPersistMode(), false)
  })

  it('.collaborative() in toMeta()', () => {
    const meta = TextField.make('title').collaborative().toMeta()
    assert.equal(meta.yjs, true)
    assert.deepEqual(meta.yjsProviders, ['websocket'])
    assert.equal(meta.persist, undefined)
  })

  it('.collaborative().persist("indexeddb") merges providers', () => {
    const f = TextField.make('title').collaborative().persist('indexeddb')
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['websocket', 'indexeddb'])
    assert.deepEqual(f.getPersistMode(), ['indexeddb'])
  })

  it('.persist("websocket").persist("indexeddb") merges providers', () => {
    const f = TextField.make('title').persist('websocket').persist('indexeddb')
    assert.equal(f.isYjs(), true)
    assert.deepEqual(f.getYjsProviders(), ['websocket', 'indexeddb'])
    // persist mode is the last call
    assert.deepEqual(f.getPersistMode(), ['indexeddb'])
  })

  it('no duplicate providers when .collaborative().persist("websocket")', () => {
    const f = TextField.make('title').collaborative().persist('websocket')
    assert.deepEqual(f.getYjsProviders(), ['websocket'])
  })
})

// ─── Field — default() ──────────────────────────────────────

describe('Field — default()', () => {
  it('static default value', () => {
    const f = TextField.make('status').default('draft')
    assert.equal(f.resolveDefault(), 'draft')
  })

  it('function default value', () => {
    const f = TextField.make('name').default((ctx: { user: string }) => ctx.user)
    assert.equal(f.resolveDefault({ user: 'John' }), 'John')
  })

  it('default undefined when not set', () => {
    assert.equal(TextField.make('x').resolveDefault(), undefined)
  })

  it('static default in toMeta()', () => {
    const meta = TextField.make('status').default('draft').toMeta()
    assert.equal(meta.defaultValue, 'draft')
  })

  it('function default NOT in toMeta() (resolved server-side)', () => {
    const meta = TextField.make('name').default(() => 'computed').toMeta()
    assert.equal(meta.defaultValue, undefined)
  })

  it('number default', () => {
    const f = NumberField.make('priority').default(5)
    assert.equal(f.resolveDefault(), 5)
    assert.equal(f.toMeta().defaultValue, 5)
  })

  it('boolean default', () => {
    const f = BooleanField.make('active').default(true)
    assert.equal(f.resolveDefault(), true)
    assert.equal(f.toMeta().defaultValue, true)
  })
})

// ─── Field — from/derive/debounce ──────────────────────────────────

describe('Field — from/derive/debounce', () => {
  it('from() sets dependencies', () => {
    const f = TextField.make('slug').from('title')
    assert.deepEqual(f.getFrom(), ['title'])
  })

  it('from() with multiple deps', () => {
    const f = TextField.make('full').from('first', 'last')
    assert.deepEqual(f.getFrom(), ['first', 'last'])
  })

  it('derive() stores function', () => {
    const fn = ({ title }: Record<string, unknown>) => String(title).toLowerCase()
    const f = TextField.make('slug').from('title').derive(fn)
    assert.ok(f.getDeriveFn())
  })

  it('debounce() sets value', () => {
    assert.equal(TextField.make('x').from('y').debounce(500).getDebounce(), 500)
  })

  it('debounce defaults to 200', () => {
    assert.equal(TextField.make('x').getDebounce(), 200)
  })

  it('from in toMeta()', () => {
    const meta = TextField.make('slug').from('title').toMeta()
    assert.deepEqual(meta.from, ['title'])
  })

  it('from not in toMeta when not set', () => {
    assert.equal(TextField.make('x').toMeta().from, undefined)
  })

  it('debounce in toMeta when from is set', () => {
    const meta = TextField.make('x').from('y').debounce(300).toMeta()
    assert.equal(meta.debounce, 300)
  })
})
