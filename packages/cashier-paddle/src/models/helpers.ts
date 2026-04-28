// Pure helper functions over plain ORM records. ORM returns records, not
// Model instances, so all derived state lives here.
//
// FUTURE: The driver-agnostic predicates (status checks) lift into
// `@rudderjs/cashier`; the Paddle-specific bits stay in this package.

import type {
  CustomerRecord,
  SubscriptionRecord,
  TransactionRecord,
  SubscriptionStatus,
} from '../contracts.js'

// ─── Date helpers ─────────────────────────────────────────

const now = (): number => Date.now()
const ts  = (d: Date | string | null | undefined): number => d ? new Date(d).getTime() : 0
const isFuture = (d: Date | string | null | undefined): boolean => d != null && ts(d) > now()
const isPast   = (d: Date | string | null | undefined): boolean => d != null && ts(d) <= now()

// ─── Subscription state predicates ────────────────────────

export const subscriptionHelpers = {
  status(s: SubscriptionRecord): SubscriptionStatus { return s.paddleStatus },

  /** Currently billing — not on trial, not paused, not canceled. */
  isActive(s: SubscriptionRecord): boolean {
    return s.paddleStatus === 'active' && !subscriptionHelpers.onGracePeriod(s)
  },

  /** Active and past trial — no grace, no trial. */
  isRecurring(s: SubscriptionRecord): boolean {
    return subscriptionHelpers.isActive(s) && !subscriptionHelpers.onTrial(s)
  },

  /** In trial period (trialEndsAt in the future). */
  onTrial(s: SubscriptionRecord): boolean {
    return s.paddleStatus === 'trialing' || (s.trialEndsAt != null && isFuture(s.trialEndsAt))
  },

  /** Trial existed and has ended. */
  hasExpiredTrial(s: SubscriptionRecord): boolean {
    return s.trialEndsAt != null && isPast(s.trialEndsAt)
  },

  isTrialing(s: SubscriptionRecord): boolean { return s.paddleStatus === 'trialing' },

  isPastDue(s: SubscriptionRecord): boolean { return s.paddleStatus === 'past_due' },

  isPaused(s: SubscriptionRecord): boolean { return s.paddleStatus === 'paused' },

  /** Paused but inside a grace period — still billable use. */
  onPausedGracePeriod(s: SubscriptionRecord): boolean {
    return s.pausedAt != null && isFuture(s.pausedAt)
  },

  isCanceled(s: SubscriptionRecord): boolean { return s.paddleStatus === 'canceled' },

  /** Canceled but inside grace period — `endsAt` in the future. */
  onGracePeriod(s: SubscriptionRecord): boolean {
    return s.endsAt != null && isFuture(s.endsAt)
  },

  /** Past `endsAt` — fully terminated. */
  ended(s: SubscriptionRecord): boolean {
    return s.endsAt != null && isPast(s.endsAt)
  },

  /**
   * "Valid" — Cashier's umbrella: active, trialing, paused-on-grace,
   * canceled-on-grace. Past-due is included only when
   * `Cashier.keepPastDueSubscriptionsActive` is enabled (caller passes flag).
   */
  isValid(s: SubscriptionRecord, opts: { keepPastDueActive?: boolean } = {}): boolean {
    if (subscriptionHelpers.isCanceled(s) && subscriptionHelpers.ended(s)) return false
    if (s.paddleStatus === 'active')   return true
    if (s.paddleStatus === 'trialing') return true
    if (s.paddleStatus === 'paused')   return subscriptionHelpers.onPausedGracePeriod(s)
    if (s.paddleStatus === 'canceled') return subscriptionHelpers.onGracePeriod(s)
    if (s.paddleStatus === 'past_due') return !!opts.keepPastDueActive
    return false
  },
}

// ─── Customer helpers ─────────────────────────────────────

export const customerHelpers = {
  /** Pre-subscription generic trial — `customer.trialEndsAt` in the future. */
  onGenericTrial(c: CustomerRecord): boolean {
    return c.trialEndsAt != null && isFuture(c.trialEndsAt)
  },
  hasExpiredGenericTrial(c: CustomerRecord): boolean {
    return c.trialEndsAt != null && isPast(c.trialEndsAt)
  },
}

// ─── Transaction helpers ──────────────────────────────────

export const transactionHelpers = {
  /** Total in minor units (string). */
  rawTotal(t: TransactionRecord): string { return t.total },
  rawTax(t: TransactionRecord): string { return t.tax },
  rawSubtotal(t: TransactionRecord): string {
    // Subtotal = total - tax. String math (minor units, BigInt-safe).
    try {
      const total = BigInt(t.total)
      const tax   = BigInt(t.tax)
      return (total - tax).toString()
    } catch {
      return t.total
    }
  },

  isCompleted(t: TransactionRecord): boolean { return t.status === 'completed' },
  isPaid(t: TransactionRecord):      boolean { return t.status === 'paid' || t.status === 'completed' },
  isPastDue(t: TransactionRecord):   boolean { return t.status === 'past_due' },
}
