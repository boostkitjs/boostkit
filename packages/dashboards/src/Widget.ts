export type WidgetSize = 'small' | 'medium' | 'large'

export interface WidgetMeta {
  id:           string
  label:        string
  defaultSize:  WidgetSize
  component:    string
  description?: string
  icon?:        string
}

export class Widget {
  private _id:          string
  private _label        = ''
  private _defaultSize: WidgetSize = 'medium'
  private _component    = 'stat'
  private _description?: string
  private _icon?:        string
  private _dataFn?:      (ctx?: unknown) => Promise<unknown>

  protected constructor(id: string) {
    this._id = id
  }

  static make(id: string): Widget {
    return new Widget(id)
  }

  label(l: string): this { this._label = l; return this }
  defaultSize(s: WidgetSize): this { this._defaultSize = s; return this }
  component(c: string): this { this._component = c; return this }
  description(d: string): this { this._description = d; return this }
  icon(i: string): this { this._icon = i; return this }
  data(fn: (ctx?: unknown) => Promise<unknown>): this { this._dataFn = fn; return this }

  getId(): string { return this._id }
  getLabel(): string { return this._label }
  getDefaultSize(): WidgetSize { return this._defaultSize }
  getComponent(): string { return this._component }
  getDataFn(): ((ctx?: unknown) => Promise<unknown>) | undefined { return this._dataFn }

  toMeta(): WidgetMeta {
    return {
      id:          this._id,
      label:       this._label,
      defaultSize: this._defaultSize,
      component:   this._component,
      ...(this._description !== undefined && { description: this._description }),
      ...(this._icon !== undefined && { icon: this._icon }),
    }
  }
}
