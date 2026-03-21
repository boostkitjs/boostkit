
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { Section }    from '../schema/Section.js'
import { TextField }  from '../schema/fields/TextField.js'
import { EmailField } from '../schema/fields/EmailField.js'

// ─── Section ─────────────────────────────────────────────────

describe('Section', () => {
  it('make() sets title', () => {
    assert.equal(Section.make('Details').toMeta().title, 'Details')
  })

  it('type is section', () => {
    assert.equal(Section.make('x').toMeta().type, 'section')
  })

  it('description() sets description', () => {
    assert.equal(Section.make('x').description('Extra info').toMeta().description, 'Extra info')
  })

  it('description defaults to undefined', () => {
    assert.equal(Section.make('x').toMeta().description, undefined)
  })

  it('collapsible defaults to false', () => {
    assert.equal(Section.make('x').toMeta().collapsible, false)
  })

  it('collapsible() enables collapsing', () => {
    assert.equal(Section.make('x').collapsible().toMeta().collapsible, true)
  })

  it('collapsed() sets initial state', () => {
    assert.equal(Section.make('x').collapsible().collapsed().toMeta().collapsed, true)
  })

  it('columns defaults to 1', () => {
    assert.equal(Section.make('x').toMeta().columns, 1)
  })

  it('columns() sets column count', () => {
    assert.equal(Section.make('x').columns(2).toMeta().columns, 2)
    assert.equal(Section.make('x').columns(3).toMeta().columns, 3)
  })

  it('schema() stores field metas', () => {
    const s = Section.make('Info').schema(
      TextField.make('name'),
      EmailField.make('email'),
    )
    const meta = s.toMeta()
    assert.equal(meta.fields.length, 2)
    assert.equal(meta.fields[0]?.name, 'name')
    assert.equal(meta.fields[1]?.name, 'email')
  })

  it('getFields() returns flat Field list', () => {
    const name  = TextField.make('name')
    const email = EmailField.make('email')
    const s = Section.make('x').schema(name, email)
    assert.deepEqual(s.getFields(), [name, email])
  })
})

// ─── Section id ────────────────────────────────────────────

describe('Section id', () => {
  it('id sets value', () => {
    const s = Section.make('Test').id('my-section')
    assert.equal(s.getId(), 'my-section')
  })

  it('id defaults to undefined', () => {
    assert.equal(Section.make('Test').getId(), undefined)
  })
})
