import type { MiddlewareHandler } from '@rudderjs/core'
import type { Panel } from '../Panel.js'
import type { PanelContext } from '../types.js'

export function buildPanelMiddleware(panel: Panel): MiddlewareHandler[] {
  const guard = panel.getGuard()
  if (!guard) return []

  const mw: MiddlewareHandler = async (req, res, next) => {
    // Resolve the authenticated user.
    // Check __rjs_user (set by AuthMiddleware), then fall back to DI auth manager.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: Record<string, unknown> | undefined = (req.raw as any)?.['__rjs_user'] ?? (req as any).user
    if (!user) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { app } = await import('@rudderjs/core') as any
        const manager = app().make('auth.manager') as {
          guard(name?: string): { user(): Promise<{ getAuthIdentifier(): string; [k: string]: unknown } | null> }
        }
        const authUser = await manager.guard().user()
        if (authUser) {
          user = {
            id:    authUser.getAuthIdentifier(),
            name:  (authUser as Record<string, unknown>)['name'] ?? '',
            email: (authUser as Record<string, unknown>)['email'] ?? '',
            ...Object.fromEntries(
              Object.entries(authUser as Record<string, unknown>)
                .filter(([_k, v]) => typeof v !== 'function'),
            ),
          }
          delete user['password']
        }
      } catch {
        // auth not configured
      }
    }

    const ctx: PanelContext = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user:    user as any,
      headers: req.headers as Record<string, string>,
      path:    req.path,
      params:  {},
    }
    const allowed = await guard(ctx)
    if (!allowed) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    await next()
  }

  return [mw]
}
