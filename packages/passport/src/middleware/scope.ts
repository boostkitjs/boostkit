import type { MiddlewareHandler } from '@rudderjs/contracts'

/**
 * Middleware that requires specific OAuth scopes on the Bearer token.
 * Must be used after BearerMiddleware or RequireBearer.
 *
 * @example
 * router.get('/admin', [RequireBearer(), scope('admin')], handler)
 * router.post('/orders', [RequireBearer(), scope('write', 'place-orders')], handler)
 */
export function scope(...requiredScopes: string[]): MiddlewareHandler {
  return async function ScopeMiddleware(req, res, next) {
    const raw = req.raw as Record<string, unknown>
    const tokenScopes = raw['__passport_scopes'] as string[] | undefined

    if (!tokenScopes) {
      res.status(403).json({
        error: 'insufficient_scope',
        message: 'Token does not have the required scopes.',
        required: requiredScopes,
      })
      return
    }

    // Wildcard scope grants everything
    if (tokenScopes.includes('*')) {
      await next()
      return
    }

    const missing = requiredScopes.filter(s => !tokenScopes.includes(s))
    if (missing.length > 0) {
      res.status(403).json({
        error: 'insufficient_scope',
        message: `Token is missing scope(s): ${missing.join(', ')}`,
        required: requiredScopes,
        missing,
      })
      return
    }

    await next()
  }
}
