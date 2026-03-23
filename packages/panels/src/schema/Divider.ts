// ─── Divider schema element ─────────────────────────────────
// Horizontal separator with optional label.
//
//   Divider.make()
//   Divider.make('Advanced Options')

export interface DividerElementMeta {
  type:   'divider'
  label?: string
}

export class Divider {
  private _label?: string

  protected constructor(label?: string) {
    if (label) this._label = label
  }

  static make(label?: string): Divider {
    return new Divider(label)
  }

  getType(): 'divider' { return 'divider' }

  toMeta(): DividerElementMeta {
    const meta: DividerElementMeta = { type: 'divider' }
    if (this._label) meta.label = this._label
    return meta
  }
}
