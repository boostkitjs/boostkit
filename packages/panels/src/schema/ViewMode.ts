import type { Column } from './Column.js'

type SchemaElement = { getType(): string }

// ─── ViewMode builder ─────────────────────────────────────
// Configures a view mode for List/Table data-view elements.
//
//   ViewMode.list()                              — built-in list preset
//   ViewMode.grid()                              — built-in grid preset
//   ViewMode.table([Column.make('title')])       — table preset with columns
//   ViewMode.make('cards').render(fn)            — custom named view

export interface ViewModeMeta {
  type:        string
  name:        string
  label:       string
  icon?:       string
  hasColumns?: boolean
}

export class ViewMode {
  private _type:      string
  private _name:      string
  private _label:     string
  private _icon?:     string
  private _renderFn?: (record: Record<string, unknown>) => SchemaElement[]
  private _columns?:  Column[]

  private constructor(name: string) {
    this._type  = 'custom'
    this._name  = name
    this._label = name.charAt(0).toUpperCase() + name.slice(1)
  }

  /** Create a custom named view mode. */
  static make(name: string): ViewMode { return new ViewMode(name) }

  /** Built-in list view preset. */
  static list(): ViewMode {
    const v = new ViewMode('list')
    v._type  = 'list'
    v._label = 'List'
    v._icon  = 'list'
    return v
  }

  /** Built-in grid view preset. */
  static grid(): ViewMode {
    const v = new ViewMode('grid')
    v._type  = 'grid'
    v._label = 'Grid'
    v._icon  = 'layout-grid'
    return v
  }

  /** Table view preset with column definitions. */
  static table(columns: Column[]): ViewMode {
    const v = new ViewMode('table')
    v._type    = 'table'
    v._label   = 'Table'
    v._icon    = 'table'
    v._columns = columns
    return v
  }

  /** Display label for the view toggle button. */
  label(label: string): this {
    this._label = label
    return this
  }

  /** Icon for the view toggle button (lucide icon name). */
  icon(icon: string): this {
    this._icon = icon
    return this
  }

  /** Custom render function — receives a record, returns schema elements. */
  render(fn: (record: Record<string, unknown>) => SchemaElement[]): this {
    this._renderFn = fn
    return this
  }

  // ── Getters ───────────────────────────────────────

  getType(): string { return this._type }
  getName(): string { return this._name }
  getLabel(): string { return this._label }
  getIcon(): string | undefined { return this._icon }
  getRenderFn(): ((record: Record<string, unknown>) => SchemaElement[]) | undefined { return this._renderFn }
  getColumns(): Column[] | undefined { return this._columns }

  /** Serialize for SSR payload. */
  toMeta(): ViewModeMeta {
    const meta: ViewModeMeta = {
      type:  this._type,
      name:  this._name,
      label: this._label,
    }
    if (this._icon) meta.icon = this._icon
    if (this._columns) meta.hasColumns = true
    return meta
  }
}
