import type { MiddlewareHandler } from '@rudderjs/contracts'
import { Cashier } from './Cashier.js'
import { captureRawBody } from './middleware/raw-body.js'
import { verifyPaddleWebhook } from './middleware/verify-paddle-webhook.js'
import { handlePaddleWebhook } from './webhooks/handler.js'

type Handler = (req: any, res: any) => Promise<unknown> | unknown

interface Router {
  post(path: string, handler: Handler, middleware?: MiddlewareHandler[]): unknown
}

export type CashierRouteGroup = 'webhook'

export interface CashierRouteOptions {
  /** Override the webhook path. Defaults to `Cashier.webhookPath()` (`/paddle/webhook`). */
  webhookPath?: string
  /** Route groups to skip. */
  except?: CashierRouteGroup[]
  /** Extra middleware to run before signature verification. */
  before?: MiddlewareHandler[]
}

/**
 * Mount Cashier's webhook receiver on the given router.
 *
 * The webhook is registered standalone (NOT inside the `web` or `api` group)
 * so it doesn't pull session/CSRF/auth/rate-limit middleware. It carries only
 * `[captureRawBody(), verifyPaddleWebhook()]`.
 *
 * Becomes a no-op when `Cashier.ignoreRoutes()` has been called — useful when
 * the app wants to mount the webhook handler manually with custom middleware.
 *
 * @example
 *   import { registerCashierRoutes } from '@rudderjs/cashier-paddle'
 *   registerCashierRoutes(Route)
 */
export function registerCashierRoutes(router: Router, opts: CashierRouteOptions = {}): void {
  if (Cashier.routesIgnored()) return

  const skip = new Set(opts.except ?? [])
  const path = opts.webhookPath ?? Cashier.webhookPath()
  const before = opts.before ?? []

  if (!skip.has('webhook')) {
    router.post(
      path,
      handlePaddleWebhook as Handler,
      [...before, captureRawBody(), verifyPaddleWebhook()],
    )
  }
}
