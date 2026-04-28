import type { CheckoutItem, CheckoutOptions } from './contracts.js'

/**
 * Checkout session builder. Pure value object — no SDK calls.
 *
 * Serialize via `.options()` and pass to Paddle.js's `Paddle.Checkout.open(...)`.
 * For server-driven checkouts (transactions API), pass to
 * `paddle().transactions.create(...)` from `paddle-client.ts`.
 *
 * @example
 *   const checkout = await user.checkout(['pri_abc', 'pri_xyz'])
 *     .returnTo('/dashboard')
 *     .customData({ orderRef: 'ORD-1' })
 *
 *   <CheckoutButton checkout={checkout.options()} />
 */
export class Checkout {
  private _items:        CheckoutItem[]                = []
  private _customerId:   string | null                 = null
  private _customerEmail: string | null                = null
  private _returnUrl:    string | null                 = null
  private _customData:   Record<string, unknown>       = {}
  private _discountId:   string | null                 = null

  constructor(opts: CheckoutOptions = {}) {
    this._items         = opts.items         ?? []
    this._customerId    = opts.customerId    ?? null
    this._customerEmail = opts.customerEmail ?? null
    this._returnUrl     = opts.returnUrl     ?? null
    this._customData    = opts.customData    ?? {}
    this._discountId    = opts.discountId    ?? null
  }

  /** Guest checkout — no authenticated billable required. */
  static guest(prices: Array<string | CheckoutItem>, opts: Omit<CheckoutOptions, 'customerId'> = {}): Checkout {
    return new Checkout({ ...opts, items: normalizePrices(prices) })
  }

  // ── Builders ──────────────────────────────────────────

  returnTo(url: string): this { this._returnUrl = url; return this }
  customData(data: Record<string, unknown>): this { this._customData = { ...this._customData, ...data }; return this }
  customer(id: string): this { this._customerId = id; return this }
  customerEmail(email: string): this { this._customerEmail = email; return this }
  discount(id: string): this { this._discountId = id; return this }

  addItem(priceId: string, quantity = 1): this {
    this._items = [...this._items, { priceId, quantity }]
    return this
  }

  // ── Getters ──────────────────────────────────────────

  getItems(): CheckoutItem[] { return [...this._items] }
  getCustomer(): { id?: string; email?: string } | null {
    if (this._customerId)    return { id: this._customerId }
    if (this._customerEmail) return { email: this._customerEmail }
    return null
  }
  getCustomData(): Record<string, unknown> { return { ...this._customData } }
  getReturnUrl(): string | null { return this._returnUrl }
  getDiscountId(): string | null { return this._discountId }

  /** Serialize for `Paddle.Checkout.open(...)`. */
  options(): SerializedCheckoutOptions {
    const out: SerializedCheckoutOptions = {
      items: this._items.map((i) => ({ priceId: i.priceId, quantity: i.quantity })),
      ...(this._returnUrl    ? { settings: { successUrl: this._returnUrl } } : {}),
      ...(this._customerId   ? { customer: { id: this._customerId } } : this._customerEmail ? { customer: { email: this._customerEmail } } : {}),
      ...(Object.keys(this._customData).length ? { customData: this._customData } : {}),
      ...(this._discountId   ? { discountId: this._discountId } : {}),
    }
    return out
  }
}

export interface SerializedCheckoutOptions {
  items:        Array<{ priceId: string; quantity: number }>
  settings?:    { successUrl: string }
  customer?:    { id?: string; email?: string }
  customData?:  Record<string, unknown>
  discountId?:  string
}

// ─── Helpers ──────────────────────────────────────────────

export function normalizePrices(prices: Array<string | CheckoutItem>): CheckoutItem[] {
  return prices.map((p) => typeof p === 'string' ? { priceId: p, quantity: 1 } : p)
}
