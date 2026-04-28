// Umbrella state predicates that read `Cashier.pastDueIsActive()` so callers
// don't have to thread the flag manually.
//
// FUTURE: This file extracts to `@rudderjs/cashier` verbatim — pure functions,
// no Paddle-specific concepts.

import { Cashier } from './Cashier.js'
import { subscriptionHelpers } from './models/helpers.js'
import type { SubscriptionRecord } from './contracts.js'

/**
 * Cashier's `subscribed()` umbrella: active, trialing, paused-on-grace,
 * canceled-on-grace, plus past-due when `keepPastDueSubscriptionsActive` is set.
 */
export function isSubscribed(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isValid(s, { keepPastDueActive: Cashier.pastDueIsActive() })
}

export function isActive(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isActive(s)
}

export function isRecurring(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isRecurring(s)
}

export function onTrial(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.onTrial(s)
}

export function hasExpiredTrial(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.hasExpiredTrial(s)
}

export function isPastDue(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isPastDue(s)
}

export function isPaused(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isPaused(s)
}

export function onGracePeriod(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.onGracePeriod(s)
}

export function onPausedGracePeriod(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.onPausedGracePeriod(s)
}

export function isCanceled(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.isCanceled(s)
}

export function ended(s: SubscriptionRecord | null | undefined): boolean {
  if (!s) return false
  return subscriptionHelpers.ended(s)
}
