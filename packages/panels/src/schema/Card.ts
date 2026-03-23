// ─── Card schema element ────────────────────────────────────
// Lightweight wrapper with title/description. No collapsible — use Section for that.
//
//   Card.make('Quick Stats')
//     .description('Last 30 days')
//     .schema([Stats.make([...])])

export interface CardElementMeta {
  type:         'card'
  title?:       string
  description?: string
  elements:     unknown[]
}

export class Card {
  private _title?:       string
  private _description?: string
  private _schema:       { getType(): string; toMeta(): unknown }[] = []

  protected constructor(title?: string) {
    if (title) this._title = title
  }

  static make(title?: string): Card {
    return new Card(title)
  }

  description(text: string): this {
    this._description = text
    return this
  }

  schema(elements: { getType(): string; toMeta(): unknown }[]): this {
    this._schema = elements
    return this
  }

  getType(): 'card' { return 'card' }
  getSchema(): { getType(): string; toMeta(): unknown }[] { return this._schema }

  toMeta(): CardElementMeta {
    const meta: CardElementMeta = { type: 'card', elements: [] }
    if (this._title) meta.title = this._title
    if (this._description) meta.description = this._description
    return meta
  }
}
