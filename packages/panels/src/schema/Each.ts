// ─── Each schema element ────────────────────────────────────
// Iterate over a collection and render schema per item.
// Supports static arrays, model queries, and async data sources.
//
//   Each.make()
//     .fromArray([{ name: 'Alice' }, { name: 'Bob' }])
//     .content((item) => [Card.make(item.name)])
//     .columns(3)
//
//   Each.make()
//     .fromModel(Category)
//     .scope((q) => q.where('active', true))
//     .content((record) => [
//       Card.make(record.name).schema([
//         Stats.make([Stat.make('Articles').value(record._count?.articles ?? 0)]),
//       ])
//     ])

import type { DataSource } from '../datasource.js'
import type { PanelContext } from '../types.js'

export type EachLayout = 'grid' | 'flex' | 'list'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelClass = { new(): any; query(): any }
type ContentFn = (item: Record<string, unknown>) => { getType(): string; toMeta(): unknown }[]

export interface EachElementMeta {
  type:     'each'
  columns:  number
  layout:   EachLayout
  items:    { elements: unknown[] }[]
}

export class Each {
  private _columns: number = 3
  private _layout:  EachLayout = 'grid'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _model?:  ModelClass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _scope?:  (q: any) => any
  private _data?:   DataSource
  private _contentFn?: ContentFn
  private _staticItems: { getType(): string; toMeta(): unknown }[][] = []

  protected constructor() {}

  static make(): Each {
    return new Each()
  }

  /** Use a Model class as data source. */
  fromModel(model: ModelClass): this {
    this._model = model
    return this
  }

  /** Filter model query. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scope(fn: (q: any) => any): this {
    this._scope = fn
    return this
  }

  /** Use a static array or async function as data source. */
  fromArray(data: DataSource): this {
    this._data = data
    return this
  }

  /** Schema generator called for each item. */
  content(fn: ContentFn): this {
    this._contentFn = fn
    return this
  }

  /** Static items — explicit schema arrays (no data source). */
  items(...schemas: { getType(): string; toMeta(): unknown }[][]): this {
    this._staticItems = schemas
    return this
  }

  /** Number of columns. Default: 3. */
  columns(n: number): this {
    this._columns = n
    return this
  }

  /** Layout mode. Default: 'grid'. */
  layout(mode: EachLayout): this {
    this._layout = mode
    return this
  }

  getType(): 'each' { return 'each' }
  getModel(): ModelClass | undefined { return this._model }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getScope(): ((q: any) => any) | undefined { return this._scope }
  getDataSource(): DataSource | undefined { return this._data }
  getContentFn(): ContentFn | undefined { return this._contentFn }
  getStaticItems(): { getType(): string; toMeta(): unknown }[][] { return this._staticItems }
  getColumns(): number { return this._columns }
  getLayout(): EachLayout { return this._layout }

  toMeta(): EachElementMeta {
    return {
      type:    'each',
      columns: this._columns,
      layout:  this._layout,
      items:   [],  // resolved by resolveSchema
    }
  }
}
