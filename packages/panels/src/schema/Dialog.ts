// ─── Dialog — presentational modal wrapper ──────────────────
// Trigger button opens a modal containing any schema elements.
// No persistence of its own — purely presentational.
//
// @example
// Dialog.make('edit-settings')
//   .trigger('Edit Settings')
//   .schema([
//     Form.make('settings-form')
//       .fields([TextField.make('name'), ...])
//       .onSubmit(async (data, ctx) => { ... }),
//   ])

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SchemaItem {}

export interface DialogElementMeta {
  type:         'dialog'
  id:           string
  trigger:      string
  title?:       string
  description?: string
  elements:     unknown[]
}

export class Dialog {
  private _id:           string
  private _trigger:      string = 'Open'
  private _title?:       string
  private _description?: string
  private _items:        SchemaItem[] = []

  private constructor(id: string) {
    this._id = id
  }

  static make(id: string): Dialog {
    return new Dialog(id)
  }

  /** Label for the button that opens the dialog. */
  trigger(label: string): this      { this._trigger     = label; return this }

  /** Optional dialog title (shown in the modal header). Defaults to the trigger label. */
  title(text: string): this         { this._title       = text;  return this }

  /** Optional description shown below the title. */
  description(text: string): this   { this._description = text;  return this }

  /** Content of the dialog — any schema elements (Form, Text, etc.). */
  schema(items: SchemaItem[]): this { this._items       = items; return this }

  getId(): string       { return this._id }
  getItems(): SchemaItem[] { return this._items }
  getType(): 'dialog'   { return 'dialog' }

  /** @internal — serialized for the meta endpoint */
  toMeta(): DialogElementMeta {
    const meta: DialogElementMeta = {
      type:     'dialog',
      id:       this._id,
      trigger:  this._trigger,
      elements: [],
    }
    if (this._title       !== undefined) meta.title       = this._title
    if (this._description !== undefined) meta.description = this._description
    return meta
  }
}
