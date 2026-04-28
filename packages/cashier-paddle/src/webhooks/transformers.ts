// Pure transformers — Paddle webhook payload → DB record fragment.
// No side effects; trivially testable from fixtures.
//
// Paddle webhook envelope (v1):
//   { event_id, event_type, occurred_at, notification_id, data: {...} }
//
// `data` shape varies per event_type. We dig for the pieces we need and
// produce a fragment suitable for `Subscription.create({...})` /
// `Subscription.update(id, {...})` / etc.

type Json = Record<string, unknown>

const str = (v: unknown): string | null => typeof v === 'string' ? v : null
const date = (v: unknown): Date | null => {
  if (typeof v !== 'string') return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? new Date(t) : null
}

// ─── Customer ─────────────────────────────────────────────

export interface CustomerFragment {
  paddleId: string
  name?:    string | null
  email?:   string | null
}

export function fromCustomerUpdated(payload: Json): CustomerFragment | null {
  const data = payload['data'] as Json | undefined
  if (!data) return null
  const id = str(data['id'])
  if (!id) return null
  return {
    paddleId: id,
    name:     str(data['name']),
    email:    str(data['email']),
  }
}

// ─── Subscription ─────────────────────────────────────────

export interface SubscriptionFragment {
  paddleId:        string
  paddleStatus:    string
  paddleProductId: string | null
  trialEndsAt:     Date | null
  pausedAt:        Date | null
  endsAt:          Date | null
  /** Read from the matching Paddle customer.id; resolver looks up our row. */
  paddleCustomerId: string | null
  items: Array<{ priceId: string; productId: string; quantity: number; status: string }>
}

export function fromSubscriptionEvent(payload: Json): SubscriptionFragment | null {
  const data = payload['data'] as Json | undefined
  if (!data) return null
  const id = str(data['id'])
  if (!id) return null

  const status = str(data['status']) ?? 'active'
  const customerId = str(data['customer_id'])

  // First item's product is what Cashier records as `paddleProductId`.
  const itemsRaw = (data['items'] as Json[] | undefined) ?? []
  const items = itemsRaw.map((it) => {
    const price   = (it['price']   as Json | undefined) ?? {}
    const product = (it['product'] as Json | undefined) ?? {}
    return {
      priceId:   str(price['id'])   ?? str(it['price_id']) ?? '',
      productId: str(product['id']) ?? str(price['product_id']) ?? '',
      quantity:  typeof it['quantity'] === 'number' ? it['quantity'] : 1,
      status:    str(it['status']) ?? 'active',
    }
  }).filter((i) => i.priceId)

  // Pause window: scheduled_change.action === 'pause' carries effective_at.
  const sched = (data['scheduled_change'] as Json | undefined) ?? null
  let pausedAt: Date | null = null
  let endsAt:   Date | null = null
  if (sched) {
    const action  = str(sched['action'])
    const effAt   = date(sched['effective_at'])
    if (action === 'pause')  pausedAt = effAt
    if (action === 'cancel') endsAt   = effAt
    if (action === 'resume') { pausedAt = null }
  }

  return {
    paddleId:         id,
    paddleStatus:     status,
    paddleProductId:  items[0]?.productId ?? null,
    trialEndsAt:      date((data['current_billing_period'] as Json | undefined)?.['ends_at']) ?? null,
    pausedAt,
    endsAt,
    paddleCustomerId: customerId,
    items,
  }
}

/**
 * `subscription.paused` — Paddle has actually paused. Stamp `pausedAt = now`
 * if not already set by a scheduled_change.
 */
export function fromSubscriptionPaused(payload: Json): SubscriptionFragment | null {
  const frag = fromSubscriptionEvent(payload)
  if (!frag) return null
  if (frag.pausedAt == null) frag.pausedAt = new Date()
  return frag
}

/** `subscription.canceled` — stamp `endsAt = now` if missing. */
export function fromSubscriptionCanceled(payload: Json): SubscriptionFragment | null {
  const frag = fromSubscriptionEvent(payload)
  if (!frag) return null
  if (frag.endsAt == null) frag.endsAt = new Date()
  return frag
}

// ─── Transaction ──────────────────────────────────────────

export interface TransactionFragment {
  paddleId:             string
  paddleCustomerId:     string | null
  paddleSubscriptionId: string | null
  invoiceNumber:        string | null
  status:               string
  total:                string
  tax:                  string
  currency:             string
  billedAt:             Date | null
}

export function fromTransactionEvent(payload: Json): TransactionFragment | null {
  const data = payload['data'] as Json | undefined
  if (!data) return null
  const id = str(data['id'])
  if (!id) return null

  const details   = (data['details'] as Json | undefined) ?? {}
  const totals    = (details['totals'] as Json | undefined) ?? {}
  const currency  = str(data['currency_code']) ?? str(totals['currency_code']) ?? 'USD'
  const total     = str(totals['total']) ?? str(totals['grand_total']) ?? '0'
  const tax       = str(totals['tax']) ?? '0'

  return {
    paddleId:             id,
    paddleCustomerId:     str(data['customer_id']),
    paddleSubscriptionId: str(data['subscription_id']),
    invoiceNumber:        str(data['invoice_number']),
    status:               str(data['status']) ?? 'completed',
    total,
    tax,
    currency,
    billedAt:             date(data['billed_at']),
  }
}
