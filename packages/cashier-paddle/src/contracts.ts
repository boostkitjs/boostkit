// FUTURE: Extracted to @rudderjs/cashier when a second driver lands.
// Driver-agnostic interfaces. Keep this file impl-free.

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'canceled'

export type TransactionStatus =
  | 'draft'
  | 'ready'
  | 'billed'
  | 'paid'
  | 'completed'
  | 'canceled'
  | 'past_due'

export interface SubscriptionRecord {
  id:                  string
  paddleId:            string
  type:                string
  paddleStatus:        SubscriptionStatus
  paddleProductId:     string | null
  billableId:          string
  billableType:        string
  trialEndsAt:         Date | null
  pausedAt:            Date | null
  endsAt:              Date | null
  createdAt:           Date
  updatedAt:           Date
}

export interface SubscriptionItemRecord {
  id:             string
  subscriptionId: string
  productId:      string
  priceId:        string
  status:         string
  quantity:       number
  createdAt:      Date
  updatedAt:      Date
}

export interface CustomerRecord {
  id:           string
  paddleId:     string | null
  billableId:   string
  billableType: string
  name:         string | null
  email:        string | null
  trialEndsAt:  Date | null
  createdAt:    Date
  updatedAt:    Date
}

export interface TransactionRecord {
  id:               string
  paddleId:         string
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  billableId:       string
  billableType:     string
  invoiceNumber:    string | null
  status:           TransactionStatus
  total:            string
  tax:              string
  currency:         string
  billedAt:         Date | null
  createdAt:        Date
  updatedAt:        Date
}

export interface CheckoutItem {
  priceId:  string
  quantity: number
}

export interface CheckoutOptions {
  items?:       CheckoutItem[]
  customerId?:  string
  customerEmail?: string
  returnUrl?:   string
  customData?:  Record<string, unknown>
  discountId?:  string
}
