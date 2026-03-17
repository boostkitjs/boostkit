import type { PanelContext } from './types.js'

// ─── Schema definition (same pattern as Panel.schema()) ─────

type PageSchemaElement = { getType(): string }

type PageSchemaDefinition =
  | PageSchemaElement[]
  | ((ctx: PanelContext) => PageSchemaElement[] | Promise<PageSchemaElement[]>)

// ─── Page meta (for UI / meta endpoint) ────────────────────

export interface PageMeta {
  slug:       string
  label:      string
  icon:       string | undefined
  hasSchema:  boolean
}

// ─── Page base class ────────────────────────────────────────

export class Page {
  /** URL slug (e.g. 'analytics'). Derived from class name if not set. */
  static slug?: string

  /** Sidebar label (e.g. 'Analytics'). Derived from class name if not set. */
  static label?: string

  /** Optional icon string shown in the sidebar. */
  static icon?: string

  /** Schema definition — renders the page from schema elements (no Vike page needed). */
  protected static _schema?: PageSchemaDefinition

  /**
   * Define the page content using schema elements.
   * When set, the page renders from schema (SSR) without needing a Vike +Page.tsx file.
   *
   * @example
   * static {
   *   this.schema(async (ctx) => [
   *     Heading.make('Analytics'),
   *     Stats.make([Stat.make('Users').value(await User.query().count())]),
   *     Chart.make('Traffic').chartType('area').labels([...]).datasets([...]),
   *   ])
   * }
   */
  static schema(def: PageSchemaDefinition): typeof Page {
    this._schema = def
    return this
  }

  // ── Static helpers ──────────────────────────────────────

  static getSlug(): string {
    if (this.slug) return this.slug
    // AnalyticsPage → analytics, SettingsPage → settings
    return this.name.replace(/Page$/, '').toLowerCase()
  }

  /**
   * Match a URL path against this page's slug pattern and extract route params.
   * Returns an object of extracted params on match, or `null` if no match.
   *
   * Supports `:param` placeholders anywhere in the slug:
   *   - `orders/:id`       → `orders/123`      → `{ id: '123' }`
   *   - `reports/:y/:m`    → `reports/2025/03`  → `{ y: '2025', m: '03' }`
   *   - `item-:id`         → `item-42`          → `{ id: '42' }`
   *   - `reports`          → `reports`           → `{}`
   */
  static matchPath(urlPath: string): Record<string, string> | null {
    const pattern = this.getSlug()
    const paramNames: string[] = []

    // Escape regex special chars, then replace :param with a capture group
    const regexSource = pattern
      .replace(/[.+*?^${}()|[\]\\]/g, '\\$&')
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name: string) => {
        paramNames.push(name)
        return '([^/]+)'
      })

    const match = urlPath.match(new RegExp(`^${regexSource}$`))
    if (!match) return null

    const params: Record<string, string> = {}
    paramNames.forEach((name, i) => { params[name] = match[i + 1]! })
    return params
  }

  static getLabel(): string {
    if (this.label) return this.label
    const name = this.name.replace(/Page$/, '')
    return name.replace(/([A-Z])/g, ' $1').trim()
  }

  static getSchema(): PageSchemaDefinition | undefined {
    return this._schema
  }

  static hasSchema(): boolean {
    return this._schema !== undefined
  }

  /** @internal */
  static toMeta(): PageMeta {
    return {
      slug:      this.getSlug(),
      label:     this.getLabel(),
      icon:      this.icon,
      hasSchema: this.hasSchema(),
    }
  }
}
