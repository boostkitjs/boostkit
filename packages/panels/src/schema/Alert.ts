// ─── Alert schema element ───────────────────────────────────
// Callout box with type-based styling.
//
//   Alert.make('Maintenance scheduled for tonight.').type('warning')
//   Alert.make('Record saved successfully.').type('success')

export type AlertType = 'info' | 'warning' | 'success' | 'danger'

export interface AlertElementMeta {
  type:       'alert'
  content:    string
  alertType:  AlertType
  title?:     string
}

export class Alert {
  private _content:   string
  private _alertType: AlertType = 'info'
  private _title?:    string

  protected constructor(content: string) {
    this._content = content
  }

  static make(content: string): Alert {
    return new Alert(content)
  }

  /** Alert style: 'info' | 'warning' | 'success' | 'danger'. Default: 'info'. */
  alertType(type: AlertType): this {
    this._alertType = type
    return this
  }

  /** Optional title displayed above the content. */
  title(text: string): this {
    this._title = text
    return this
  }

  /** Shorthand for .alertType('info') */
  info(): this { return this.alertType('info') }
  /** Shorthand for .alertType('warning') */
  warning(): this { return this.alertType('warning') }
  /** Shorthand for .alertType('success') */
  success(): this { return this.alertType('success') }
  /** Shorthand for .alertType('danger') */
  danger(): this { return this.alertType('danger') }

  getType(): 'alert' { return 'alert' }

  toMeta(): AlertElementMeta {
    const meta: AlertElementMeta = {
      type:      'alert',
      content:   this._content,
      alertType: this._alertType,
    }
    if (this._title) meta.title = this._title
    return meta
  }
}
