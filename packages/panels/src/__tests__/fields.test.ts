
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { TextField }    from '../schema/fields/TextField.js'
import { EmailField }   from '../schema/fields/EmailField.js'
import { NumberField }  from '../schema/fields/NumberField.js'
import { TextareaField } from '../schema/fields/TextareaField.js'
import { SelectField }  from '../schema/fields/SelectField.js'
import { BooleanField } from '../schema/fields/BooleanField.js'
import { DateField }    from '../schema/fields/DateField.js'
import { RelationField } from '../schema/fields/RelationField.js'
import { HasMany }       from '../schema/fields/HasMany.js'
import { PasswordField } from '../schema/fields/PasswordField.js'
import { SlugField }     from '../schema/fields/SlugField.js'
import { TagsField }     from '../schema/fields/TagsField.js'
import { HiddenField }   from '../schema/fields/HiddenField.js'
import { ToggleField }   from '../schema/fields/ToggleField.js'
import { ColorField }    from '../schema/fields/ColorField.js'
import { JsonField }     from '../schema/fields/JsonField.js'
import { RepeaterField } from '../schema/fields/RepeaterField.js'
import { BuilderField }  from '../schema/fields/BuilderField.js'
import { FileField }     from '../schema/fields/FileField.js'
import { ComputedField } from '../schema/fields/ComputedField.js'
import { Block }         from '../schema/Block.js'

// ─── Field types ────────────────────────────────────────────

describe('TextField', () => {
  it('type is text', () => assert.equal(TextField.make('x').getType(), 'text'))
})

describe('EmailField', () => {
  it('type is email', () => assert.equal(EmailField.make('x').getType(), 'email'))
})

describe('NumberField', () => {
  it('type is number', () => assert.equal(NumberField.make('x').getType(), 'number'))

  it('min/max/step stored in extra', () => {
    const f = NumberField.make('x').min(0).max(100).step(5)
    assert.equal(f.toMeta().extra['min'], 0)
    assert.equal(f.toMeta().extra['max'], 100)
    assert.equal(f.toMeta().extra['step'], 5)
  })
})

describe('TextareaField', () => {
  it('type is textarea', () => assert.equal(TextareaField.make('x').getType(), 'textarea'))

  it('rows stored in extra', () => {
    const f = TextareaField.make('x').rows(8)
    assert.equal(f.toMeta().extra['rows'], 8)
  })
})

describe('BooleanField', () => {
  it('type is boolean', () => assert.equal(BooleanField.make('x').getType(), 'boolean'))
})

describe('DateField', () => {
  it('type is date', () => assert.equal(DateField.make('x').getType(), 'date'))
  it('withTime() → datetime', () => assert.equal(DateField.make('x').withTime().getType(), 'datetime'))
})

describe('SelectField', () => {
  it('type is select', () => assert.equal(SelectField.make('x').getType(), 'select'))
  it('type is multiselect when multiple()', () => assert.equal(SelectField.make('x').multiple().getType(), 'multiselect'))

  it('normalises string options', () => {
    const meta = SelectField.make('role').options(['admin', 'user']).toMeta()
    assert.deepEqual(meta.extra['options'], [
      { label: 'admin', value: 'admin' },
      { label: 'user',  value: 'user' },
    ])
  })

  it('accepts label/value pairs', () => {
    const meta = SelectField.make('role')
      .options([{ label: 'Admin', value: 'admin' }])
      .toMeta()
    assert.deepEqual(meta.extra['options'], [{ label: 'Admin', value: 'admin' }])
  })

  it('default stored in extra', () => {
    const meta = SelectField.make('role').options(['a', 'b']).default('a').toMeta()
    assert.equal(meta.extra['default'], 'a')
  })
})

describe('RelationField', () => {
  it('type is belongsTo by default', () => assert.equal(RelationField.make('author').getType(), 'belongsTo'))
  it('type is belongsToMany when multiple()', () => assert.equal(RelationField.make('tags').multiple().getType(), 'belongsToMany'))

  it('resource/displayField stored in extra', () => {
    const meta = RelationField.make('author')
      .resource('UserResource')
      .displayField('email')
      .toMeta()
    assert.equal(meta.extra['resource'], 'UserResource')
    assert.equal(meta.extra['displayField'], 'email')
  })
})

describe('PasswordField', () => {
  it('type is password', () => {
    assert.equal(PasswordField.make('password').toMeta().type, 'password')
  })

  it('confirm() sets confirm flag', () => {
    assert.equal(PasswordField.make('password').confirm().toMeta().extra['confirm'], true)
  })

  it('confirm defaults to false', () => {
    assert.equal(PasswordField.make('password').toMeta().extra['confirm'], false)
  })

  it('is hidden from table by default', () => {
    assert.ok(PasswordField.make('password').toMeta().hidden.includes('table'))
  })
})

describe('SlugField', () => {
  it('type is slug', () => {
    assert.equal(SlugField.make('slug').toMeta().type, 'slug')
  })

  it('from() sets source field', () => {
    assert.equal(SlugField.make('slug').from('title').toMeta().extra['from'], 'title')
  })

  it('from defaults to undefined', () => {
    assert.equal(SlugField.make('slug').toMeta().extra['from'], undefined)
  })
})

describe('TagsField', () => {
  it('type is tags', () => {
    assert.equal(TagsField.make('tags').toMeta().type, 'tags')
  })

  it('placeholder() sets placeholder', () => {
    assert.equal(TagsField.make('tags').placeholder('Add a tag').toMeta().extra['placeholder'], 'Add a tag')
  })
})

describe('HiddenField', () => {
  it('type is hidden', () => {
    assert.equal(HiddenField.make('userId').toMeta().type, 'hidden')
  })

  it('default() sets default value', () => {
    assert.equal(HiddenField.make('status').default('draft').toMeta().extra['default'], 'draft')
  })

  it('is hidden from table by default', () => {
    const meta = HiddenField.make('x').toMeta()
    assert.ok(meta.hidden.includes('table'))
  })
})

describe('ToggleField', () => {
  it('type is toggle', () => {
    assert.equal(ToggleField.make('active').toMeta().type, 'toggle')
  })

  it('onLabel/offLabel defaults', () => {
    const meta = ToggleField.make('active').toMeta()
    assert.equal(meta.extra['onLabel'],  'On')
    assert.equal(meta.extra['offLabel'], 'Off')
  })

  it('custom labels', () => {
    const meta = ToggleField.make('published')
      .onLabel('Published').offLabel('Draft').toMeta()
    assert.equal(meta.extra['onLabel'],  'Published')
    assert.equal(meta.extra['offLabel'], 'Draft')
  })
})

describe('ColorField', () => {
  it('type is color', () => {
    assert.equal(ColorField.make('brandColor').toMeta().type, 'color')
  })
})

describe('JsonField', () => {
  it('type is json', () => {
    assert.equal(JsonField.make('metadata').toMeta().type, 'json')
  })

  it('rows() sets row count', () => {
    assert.equal(JsonField.make('metadata').rows(10).toMeta().extra['rows'], 10)
  })

  it('rows defaults to 6', () => {
    assert.equal(JsonField.make('metadata').toMeta().extra['rows'], 6)
  })
})

describe('RepeaterField', () => {
  it('type is repeater', () => {
    assert.equal(RepeaterField.make('items').toMeta().type, 'repeater')
  })

  it('schema() stores field metas in extra', () => {
    const f = RepeaterField.make('features').schema([
      TextField.make('title'),
      BooleanField.make('active'),
    ])
    const meta = f.toMeta()
    const schema = meta.extra['schema'] as Array<{ type: string; name: string }>
    assert.equal(schema.length, 2)
    assert.equal(schema[0]?.type, 'text')
    assert.equal(schema[1]?.type, 'boolean')
  })

  it('addLabel() sets the add button label', () => {
    const f = RepeaterField.make('items').addLabel('Add Feature')
    assert.equal(f.toMeta().extra['addLabel'], 'Add Feature')
  })

  it('addLabel defaults to "Add item"', () => {
    assert.equal(RepeaterField.make('items').toMeta().extra['addLabel'], 'Add item')
  })

  it('maxItems() sets max', () => {
    assert.equal(RepeaterField.make('items').maxItems(5).toMeta().extra['maxItems'], 5)
  })
})

describe('Block', () => {
  it('make() sets name', () => {
    assert.equal(Block.make('hero').toMeta().name, 'hero')
  })

  it('label() sets label, defaults to name', () => {
    assert.equal(Block.make('hero').toMeta().label, 'hero')
    assert.equal(Block.make('hero').label('Hero Section').toMeta().label, 'Hero Section')
  })

  it('icon() sets icon', () => {
    assert.equal(Block.make('hero').icon('🦸').toMeta().icon, '🦸')
  })

  it('icon defaults to undefined', () => {
    assert.equal(Block.make('hero').toMeta().icon, undefined)
  })

  it('schema() stores field metas', () => {
    const b = Block.make('hero').schema([TextField.make('heading')])
    assert.equal(b.toMeta().schema.length, 1)
    assert.equal(b.toMeta().schema[0]?.name, 'heading')
  })
})

describe('BuilderField', () => {
  it('type is builder', () => {
    assert.equal(BuilderField.make('content').toMeta().type, 'builder')
  })

  it('blocks() stores block metas in extra', () => {
    const f = BuilderField.make('content').blocks([
      Block.make('hero').schema([TextField.make('heading')]),
      Block.make('text').schema([TextareaField.make('body')]),
    ])
    const blocks = f.toMeta().extra['blocks'] as Array<{ name: string }>
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0]?.name, 'hero')
    assert.equal(blocks[1]?.name, 'text')
  })

  it('addLabel defaults to "Add block"', () => {
    assert.equal(BuilderField.make('content').toMeta().extra['addLabel'], 'Add block')
  })

  it('addLabel() sets label', () => {
    assert.equal(
      BuilderField.make('content').addLabel('Add section').toMeta().extra['addLabel'],
      'Add section',
    )
  })

  it('maxItems() sets max', () => {
    assert.equal(BuilderField.make('content').maxItems(10).toMeta().extra['maxItems'], 10)
  })
})

// ─── FileField ───────────────────────────────────────────────

describe('FileField', () => {
  it('type is file by default', () => {
    assert.equal(FileField.make('attachment').getType(), 'file')
  })

  it('image() changes type to image', () => {
    assert.equal(FileField.make('photo').image().getType(), 'image')
  })

  it('accept() stores mime type', () => {
    assert.equal(FileField.make('f').accept('image/*').toMeta().extra['accept'], 'image/*')
  })

  it('maxSize() stores size in MB', () => {
    assert.equal(FileField.make('f').maxSize(5).toMeta().extra['maxSize'], 5)
  })

  it('maxSize defaults to 10', () => {
    assert.equal(FileField.make('f').toMeta().extra['maxSize'], 10)
  })

  it('multiple() sets multiple flag', () => {
    assert.equal(FileField.make('f').multiple().toMeta().extra['multiple'], true)
  })

  it('multiple defaults to false', () => {
    assert.equal(FileField.make('f').toMeta().extra['multiple'], false)
  })

  it('disk() sets disk name', () => {
    assert.equal(FileField.make('f').disk('s3').toMeta().extra['disk'], 's3')
  })

  it('disk defaults to local', () => {
    assert.equal(FileField.make('f').toMeta().extra['disk'], 'local')
  })

  it('directory() sets upload directory', () => {
    assert.equal(FileField.make('f').directory('images').toMeta().extra['directory'], 'images')
  })
})

// ─── HasMany ─────────────────────────────────────────────────

describe('HasMany', () => {
  it('type is hasMany', () => {
    assert.equal(HasMany.make('comments').getType(), 'hasMany')
  })

  it('is hidden from table, create, and edit by default', () => {
    const f = HasMany.make('comments').toMeta()
    assert.ok(f.hidden.includes('table'))
    assert.ok(f.hidden.includes('create'))
    assert.ok(f.hidden.includes('edit'))
  })

  it('sets resource slug', () => {
    const f = HasMany.make('comments').resource('comments').toMeta()
    assert.equal(f.extra['resource'], 'comments')
  })

  it('sets foreignKey', () => {
    const f = HasMany.make('comments').foreignKey('postId').toMeta()
    assert.equal(f.extra['foreignKey'], 'postId')
  })

  it('sets display field', () => {
    const f = HasMany.make('comments').displayField('body').toMeta()
    assert.equal(f.extra['displayField'], 'body')
  })

  it('throughMany sets flag', () => {
    const f = HasMany.make('tags').throughMany().toMeta()
    assert.equal(f.extra['throughMany'], true)
  })
})

// ─── ComputedField ───────────────────────────────────────────

describe('ComputedField', () => {
  it('type is "computed"', () => {
    const f = ComputedField.make('x').compute(() => '')
    assert.equal(f.toMeta().type, 'computed')
  })

  it('is auto-readonly and hidden from create/edit', () => {
    const meta = ComputedField.make('x').compute(() => '').toMeta()
    assert.equal(meta.readonly, true)
    assert.ok(meta.hidden.includes('create'))
    assert.ok(meta.hidden.includes('edit'))
  })

  it('apply() calls compute function', () => {
    const f = ComputedField.make('fullName')
      .compute((r) => `${(r as any).first} ${(r as any).last}`)
    assert.equal(f.apply({ first: 'Jane', last: 'Doe' }), 'Jane Doe')
  })

  it('can chain .display()', () => {
    const f = ComputedField.make('wordCount')
      .compute((r) => ((r as any).body ?? '').split(/\s+/).length)
      .display((v) => `${v} words`)
    assert.equal(f.toMeta().displayTransformed, true)
    assert.equal(f.apply({ body: 'hello world foo' }), 3)
    assert.equal(f.applyDisplay(3, {}), '3 words')
  })
})
