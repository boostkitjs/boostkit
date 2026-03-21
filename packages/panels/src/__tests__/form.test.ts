
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { Form }      from '../schema/Form.js'
import { Section }   from '../schema/Section.js'
import { TextField } from '../schema/fields/TextField.js'

// ─── Form enhancements ──────────────────────────────────────

describe('Form enhancements', () => {
  it('make() creates a form with given ID', () => {
    const f = Form.make('contact')
    assert.equal(f.getId(), 'contact')
    assert.equal(f.getType(), 'form')
  })

  it('description() stored in meta', () => {
    const meta = Form.make('x').description('Fill this out').toMeta()
    assert.equal(meta.description, 'Fill this out')
  })

  it('method(PUT) stored in meta', () => {
    const meta = Form.make('x').method('PUT').toMeta()
    assert.equal(meta.method, 'PUT')
  })

  it('method defaults to POST and is omitted from meta', () => {
    const meta = Form.make('x').toMeta()
    assert.equal(meta.method, undefined)
  })

  it('action() stored in meta', () => {
    const meta = Form.make('x').action('/api/custom').toMeta()
    assert.equal(meta.action, '/api/custom')
  })

  it('fields() accepts mixed Field and Section items', () => {
    const f = Form.make('x').fields([
      TextField.make('a'),
      Section.make('S').schema(TextField.make('b')),
    ])
    assert.equal(f.getFields().length, 2)
  })

  it('toMeta() serializes fields', () => {
    const meta = Form.make('x')
      .fields([TextField.make('name')])
      .submitLabel('Send')
      .successMessage('Done!')
      .toMeta()
    assert.equal(meta.type, 'form')
    assert.equal(meta.id, 'x')
    assert.equal(meta.fields.length, 1)
    assert.equal(meta.submitLabel, 'Send')
    assert.equal(meta.successMessage, 'Done!')
  })

  it('data() stores data function', () => {
    const fn = async () => ({ name: 'test' })
    const f = Form.make('x').data(fn)
    assert.equal(f.getDataFn(), fn)
  })

  it('beforeSubmit() stores hook', () => {
    const fn = async (data: Record<string, unknown>) => data
    const f = Form.make('x').beforeSubmit(fn)
    assert.equal(f.getBeforeSubmit(), fn)
  })

  it('afterSubmit() stores hook', () => {
    const fn = async () => {}
    const f = Form.make('x').afterSubmit(fn)
    assert.equal(f.getAfterSubmit(), fn)
  })

  it('onSubmit() stores submit handler', () => {
    const fn = async () => {}
    const f = Form.make('x').onSubmit(fn)
    assert.equal(f.getSubmitHandler(), fn)
  })
})
