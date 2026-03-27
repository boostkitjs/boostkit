import { List } from './List.js'
import type { ListConfig } from './List.js'
import type { Column } from './Column.js'

// ─── Table2 schema element ──────────────────────────────────
// Extends List with column layout.
// All shared features (data sources, search, pagination, filters, scopes,
// sortable, reorderable, onSave, views, actions, live, etc.) are on List.

export interface Table2Config extends ListConfig {
  columns: string[] | Column[]
}

export class Table2 extends List {
  private _columns: string[] | Column[] = []

  protected constructor(title: string) {
    super(title)
  }

  static make(title: string): Table2 {
    return new Table2(title)
  }

  /** Column names (resolved via Resource fields) or Column instances. */
  columns(cols: string[] | Column[]): this {
    this._columns = cols
    return this
  }

  // ── Overrides ─────────────────────────────────────

  getType(): 'table' { return 'table' }

  getConfig(): Table2Config {
    return {
      ...super.getConfig(),
      columns: this._columns,
    }
  }

  /**
   * @internal — Create a copy with a different scope and ID.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _cloneWithScope(id: string, scopeFn?: (query: any) => any): Table2 {
    const clone = Table2.make(this._title)
    this._cloneBase(clone)
    clone._columns = this._columns
    clone._id = id
    if (scopeFn) clone._scope = scopeFn
    else if (this._scope) clone._scope = this._scope
    return clone
  }
}
