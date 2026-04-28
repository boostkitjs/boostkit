// Plain event classes dispatched via @rudderjs/core's global EventDispatcher.
// Listeners attach in the consumer's bootstrap/providers.ts:
//
//   eventsProvider({
//     SubscriptionUpdated: [MyListener],
//     WebhookReceived:     [MyAuditListener],
//   })

import type {
  CustomerRecord,
  SubscriptionRecord,
  TransactionRecord,
} from '../contracts.js'

/** Fired before any side effects, with the raw decoded payload. */
export class WebhookReceived {
  constructor(
    public readonly eventType: string,
    public readonly payload:   Record<string, unknown>,
  ) {}
}

/** Fired after a webhook was processed successfully (incl. idempotency hits). */
export class WebhookHandled {
  constructor(
    public readonly eventType: string,
    public readonly payload:   Record<string, unknown>,
  ) {}
}

export class CustomerUpdated {
  constructor(public readonly customer: CustomerRecord) {}
}

export class TransactionCompleted {
  constructor(public readonly transaction: TransactionRecord) {}
}

export class TransactionUpdated {
  constructor(public readonly transaction: TransactionRecord) {}
}

export class SubscriptionCreated {
  constructor(public readonly subscription: SubscriptionRecord) {}
}

export class SubscriptionUpdated {
  constructor(public readonly subscription: SubscriptionRecord) {}
}

export class SubscriptionPaused {
  constructor(public readonly subscription: SubscriptionRecord) {}
}

export class SubscriptionCanceled {
  constructor(public readonly subscription: SubscriptionRecord) {}
}
