import type { Field, FieldMeta } from '../Field.js'
import type { PanelContext } from '../types.js'

// ─── Types ──────────────────────────────────────────────────

export type FormSubmitFn = (
  data: Record<string, unknown>,
  ctx: PanelContext,
) => Promise<void | Record<string, unknown>>

export interface FormElementMeta {
  type:            'form'
  id:              string
  fields:          FieldMeta[]
  submitLabel?:    string
  successMessage?: string
}

// ─── Form class ─────────────────────────────────────────────

/**
 * Standalone form schema element.
 * Can be embedded anywhere in a panel schema (homepage, Page, Section, Tab).
 * Uses the existing field system — all field types work.
 * NOT tied to a model/resource — general purpose.
 *
 * @example
 * Form.make('contact')
 *   .fields([
 *     TextField.make('name').label('Name').required(),
 *     EmailField.make('email').label('Email').required(),
 *     TextareaField.make('message').label('Message'),
 *   ])
 *   .onSubmit(async (data, ctx) => {
 *     await Mail.to('admin@example.com').send(new ContactMail(data))
 *   })
 *   .successMessage('Thanks! We'll be in touch.')
 */
export class Form {
  private _id:              string
  private _fields:          Field[]         = []
  private _onSubmit?:       FormSubmitFn
  private _submitLabel?:    string
  private _successMessage?: string

  private constructor(id: string) {
    this._id = id
  }

  static make(id: string): Form {
    return new Form(id)
  }

  fields(fields: Field[]): this {
    this._fields = fields
    return this
  }

  onSubmit(fn: FormSubmitFn): this {
    this._onSubmit = fn
    return this
  }

  /** Label for the submit button (default: 'Submit'). */
  submitLabel(label: string): this {
    this._submitLabel = label
    return this
  }

  /** Message shown after successful submission (default: 'Submitted successfully.'). */
  successMessage(msg: string): this {
    this._successMessage = msg
    return this
  }

  getId(): string                        { return this._id }
  getFields(): Field[]                   { return this._fields }
  getSubmitHandler(): FormSubmitFn | undefined { return this._onSubmit }
  getType(): 'form'                      { return 'form' }

  /** @internal — serialized for the meta endpoint */
  toMeta(): FormElementMeta {
    const meta: FormElementMeta = {
      type:   'form',
      id:     this._id,
      fields: this._fields.map(f => f.toMeta()),
    }
    if (this._submitLabel   !== undefined) meta.submitLabel   = this._submitLabel
    if (this._successMessage !== undefined) meta.successMessage = this._successMessage
    return meta
  }
}
