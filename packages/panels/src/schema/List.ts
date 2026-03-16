export interface ListItem {
  label:        string
  description?: string
  href?:        string
  icon?:        string
}

export interface ListElementMeta {
  type:   'list'
  title:  string
  items:  ListItem[]
  limit:  number
}

export class List {
  private _title: string
  private _items: ListItem[] = []
  private _limit = 5

  protected constructor(title: string) {
    this._title = title
  }

  static make(title: string): List {
    return new List(title)
  }

  items(items: ListItem[]): this {
    this._items = items
    return this
  }

  limit(n: number): this {
    this._limit = n
    return this
  }

  getType(): 'list' { return 'list' }

  toMeta(): ListElementMeta {
    return {
      type:  'list',
      title: this._title,
      items: this._items.slice(0, this._limit),
      limit: this._limit,
    }
  }
}
