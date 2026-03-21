// ─── Code schema element ────────────────────────────────────

export interface CodeElementMeta {
  type:         'code'
  content:      string
  language?:    string
  title?:       string
  lineNumbers?: boolean
}

export class Code {
  private _content:     string
  private _language?:   string
  private _title?:      string
  private _lineNumbers  = false

  protected constructor(content: string) {
    this._content = content
  }

  static make(content: string): Code {
    return new Code(content)
  }

  /** Syntax highlighting language (e.g. 'typescript', 'bash', 'json'). */
  language(lang: string): this {
    this._language = lang
    return this
  }

  /** Optional title displayed above the code block. */
  title(text: string): this {
    this._title = text
    return this
  }

  /** Show line numbers. Default: false. */
  lineNumbers(show = true): this {
    this._lineNumbers = show
    return this
  }

  getType(): 'code' { return 'code' }

  toMeta(): CodeElementMeta {
    const meta: CodeElementMeta = { type: 'code', content: this._content }
    if (this._language    !== undefined) meta.language    = this._language
    if (this._title       !== undefined) meta.title       = this._title
    if (this._lineNumbers)               meta.lineNumbers = true
    return meta
  }
}
