// ─── Column — display column for Table.make() ───────────────
//
// Distinct from Field:
//   Field — input, user edits, validates, persists (form context)
//   Column — display, sortable/filterable/searchable (table context)

import type { FieldMeta } from './Field.js'
import type { PanelContext } from '../types.js'

export type EditMode = 'inline' | 'popover' | 'modal'
type ColumnSaveHandler = (record: Record<string, unknown>, value: unknown, ctx: PanelContext) => Promise<void> | void

export interface ColumnMeta {
  name:       string
  label:      string
  sortable:   boolean
  searchable: boolean
  type:       'string' | 'number' | 'boolean' | 'date' | 'badge' | 'image'
  format?:    string
  href?:      string
  editable?:  boolean
  editMode?:  EditMode
  editField?: FieldMeta
}

const INLINE_TYPES = new Set(['text', 'email', 'number', 'select', 'toggle', 'boolean', 'color', 'date', 'datetime'])
const POPOVER_TYPES = new Set(['textarea', 'tags', 'json', 'slug'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComputeFn = (record: Record<string, any>) => unknown
type DisplayFn = (value: unknown, record?: Record<string, unknown>) => unknown

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldLike = { getType(): string; toMeta(): any }

export class Column {
  private _name:       string
  private _label:      string
  private _sortable:   boolean = false
  private _searchable: boolean = false
  private _type:       ColumnMeta['type'] = 'string'
  private _format?:    string
  private _href?:      string
  private _computeFn?: ComputeFn
  private _displayFn?: DisplayFn
  private _editable        = false
  private _editMode?:       EditMode
  private _editField?:      FieldLike
  private _onSaveFn?:       ColumnSaveHandler

  private constructor(name: string) {
    this._name  = name
    this._label = name.replace(/([A-Z])/g, ' $1').trim()
      .replace(/^./, s => s.toUpperCase())
  }

  static make(name: string): Column {
    return new Column(name)
  }

  label(text: string): this         { this._label      = text;  return this }
  sortable(val = true): this        { this._sortable   = val;   return this }
  searchable(val = true): this      { this._searchable = val;   return this }
  numeric(): this                   { this._type       = 'number';  return this }
  boolean(): this                   { this._type       = 'boolean'; return this }
  date(format?: string): this       { this._type = 'date'; if (format) this._format = format; return this }
  badge(): this                     { this._type       = 'badge';  return this }
  image(): this                     { this._type       = 'image';  return this }

  /** Make column values clickable links. Use ':value' as a placeholder for the cell value. */
  href(pattern: string): this       { this._href       = pattern; return this }

  /**
   * Compute a derived value from the full record. Runs server-side (SSR + API).
   * The computed value replaces the column's value in the record before rendering.
   *
   * @example
   * Column.make('wordCount')
   *   .compute((record) => record.content?.split(/\s+/).length ?? 0)
   */
  compute(fn: ComputeFn): this {
    this._computeFn = fn
    return this
  }

  /**
   * Format the column value for display. Runs server-side (SSR + API).
   *
   * @example
   * Column.make('price').display((v) => `$${((v as number) / 100).toFixed(2)}`)
   * Column.make('wordCount').compute(r => r.body?.split(/\s+/).length).display(v => `${v} words`)
   */
  display(fn: DisplayFn): this {
    this._displayFn = fn
    return this
  }

  /**
   * Enable inline editing for this column.
   *
   * Overloads:
   * - `editable()` — enable with auto mode
   * - `editable('popover')` — enable with forced mode
   * - `editable(field)` — enable with custom field, auto mode
   * - `editable(field, 'modal')` — enable with custom field + forced mode
   */
  editable(modeOrField?: EditMode | FieldLike, mode?: EditMode): this {
    this._editable = true
    if (modeOrField !== undefined) {
      if (typeof modeOrField === 'string') {
        // editable('inline') / editable('popover') / editable('modal')
        this._editMode = modeOrField
      } else if (typeof (modeOrField as FieldLike).getType === 'function') {
        // editable(field) or editable(field, mode)
        this._editField = modeOrField as FieldLike
        if (mode) this._editMode = mode
      }
    }
    return this
  }

  /** Store a column-level save handler for inline editing. */
  onSave(fn: ColumnSaveHandler): this {
    this._onSaveFn = fn
    return this
  }

  isEditable(): boolean { return this._editable }
  getEditMode(): EditMode | undefined { return this._editMode }
  getEditField(): FieldLike | undefined { return this._editField }
  getOnSaveFn(): ColumnSaveHandler | undefined { return this._onSaveFn }

  getName(): string  { return this._name }
  getComputeFn(): ComputeFn | undefined { return this._computeFn }
  getDisplayFn(): DisplayFn | undefined { return this._displayFn }

  toMeta(): ColumnMeta {
    const meta: ColumnMeta = {
      name:       this._name,
      label:      this._label,
      sortable:   this._sortable,
      searchable: this._searchable,
      type:       this._type,
    }
    if (this._format !== undefined) meta.format = this._format
    if (this._href   !== undefined) meta.href   = this._href

    if (this._editable) {
      meta.editable = true

      // Resolve edit mode: explicit > auto-from-field-type > 'inline'
      if (this._editMode) {
        meta.editMode = this._editMode
      } else if (this._editField) {
        const fieldType = this._editField.getType()
        meta.editMode = INLINE_TYPES.has(fieldType) ? 'inline'
          : POPOVER_TYPES.has(fieldType) ? 'popover'
          : 'modal'
      } else {
        meta.editMode = 'inline'
      }

      // Serialize editField — custom or default
      if (this._editField) {
        meta.editField = this._editField.toMeta() as FieldMeta
      } else {
        // No custom field — create a minimal FieldMeta from column type
        const defaultType = this._type === 'number' ? 'number'
          : this._type === 'boolean' ? 'toggle'
          : this._type === 'date' ? 'date'
          : 'text'
        meta.editField = { name: this._name, type: defaultType, label: '', required: false, readonly: false, sortable: false, searchable: false, hidden: [], extra: {} }
      }
    }

    return meta
  }
}
