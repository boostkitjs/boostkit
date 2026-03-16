import type { Widget } from './Widget.js'

export class DashboardRegistry {
  private static _widgets: Map<string, Widget> = new Map()

  static register(widget: Widget): void {
    this._widgets.set(widget.getId(), widget)
  }

  static get(id: string): Widget | undefined {
    return this._widgets.get(id)
  }

  static all(): Widget[] {
    return [...this._widgets.values()]
  }

  static has(id: string): boolean {
    return this._widgets.has(id)
  }

  static reset(): void {
    this._widgets.clear()
  }
}
