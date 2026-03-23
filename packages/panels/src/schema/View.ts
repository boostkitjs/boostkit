// ─── View schema element ────────────────────────────────────
// Render schema from a single data object.
//
//   View.make()
//     .data({ title: 'Stats', count: 10 })
//     .content((item) => [
//       Card.make(item.title).schema([
//         Stats.make([Stat.make(item.title).value(item.count)]),
//       ])
//     ])
//
//   View.make()
//     .data(async (ctx) => {
//       const user = await User.find(ctx.params.id)
//       return user
//     })
//     .content((user) => [
//       Heading.make(user.name),
//       Stats.make([Stat.make('Posts').value(user.postsCount)]),
//     ])

import type { PanelContext } from '../types.js'

type SyncData = Record<string, unknown>
type AsyncData = (ctx: PanelContext) => Promise<Record<string, unknown>>
type ContentFn = (data: Record<string, unknown>) => { getType(): string; toMeta(): unknown }[]

export interface ViewElementMeta {
  type:     'view'
  elements: unknown[]
}

export class View {
  private _data?:      SyncData | AsyncData
  private _contentFn?: ContentFn

  protected constructor() {}

  static make(): View {
    return new View()
  }

  /** Static data object or async function that returns data. */
  data(data: SyncData | AsyncData): this {
    this._data = data
    return this
  }

  /** Schema generator called with the resolved data. */
  content(fn: ContentFn): this {
    this._contentFn = fn
    return this
  }

  getType(): 'view' { return 'view' }
  getData(): SyncData | AsyncData | undefined { return this._data }
  getContentFn(): ContentFn | undefined { return this._contentFn }

  toMeta(): ViewElementMeta {
    return {
      type:     'view',
      elements: [],  // resolved by resolveSchema
    }
  }
}
