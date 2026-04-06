import type { AppRequest, AppResponse, MiddlewareHandler } from '@rudderjs/core'
import type { RouterLike } from './types.js'
import type { Panel } from '../Panel.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NotificationRecord {
  id: string
  type: string
  data: Record<string, unknown>
  readAt: Date | null
  createdAt: Date
}

interface NotificationStoreLike {
  list(userId: string, opts?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationRecord[]>
  markAsRead(id: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  unreadCount(userId: string): Promise<number>
}

function extractUserId(req: AppRequest): string | undefined {
  const r = req as any
  return r.user?.id ?? r.session?.get?.('userId') ?? undefined
}

async function resolveNotificationStore(): Promise<NotificationStoreLike | null> {
  try {
    const { app } = await import(/* @vite-ignore */ '@rudderjs/core') as { app(): { make(k: string): unknown } }
    return app().make('notifications.store') as NotificationStoreLike
  } catch { return null }
}

export function mountNotificationRoutes(
  router: RouterLike,
  panel: Panel,
  mw: MiddlewareHandler[],
): void {
  const base = panel.getPath()

  // GET — list notifications for current user
  router.get(`${base}/api/_notifications`, async (req: AppRequest, res: AppResponse) => {
    const store = await resolveNotificationStore()
    if (!store) return res.status(404).json({ message: 'Notification store not available.' })

    const userId = extractUserId(req)
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' })

    const url = new URL(req.url, 'http://localhost')
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const limit = Number(url.searchParams.get('limit') ?? 20)

    const notifications = await store.list(userId, { unreadOnly, limit })
    const unreadCount = await store.unreadCount(userId)

    return res.json({ notifications, unreadCount })
  }, mw)

  // POST — mark a notification as read
  router.post(`${base}/api/_notifications/:id/read`, async (req: AppRequest, res: AppResponse) => {
    const store = await resolveNotificationStore()
    if (!store) return res.status(404).json({ message: 'Notification store not available.' })

    const id = (req.params as Record<string, string | undefined>)['id'] ?? ''
    await store.markAsRead(id)
    return res.json({ ok: true })
  }, mw)

  // POST — mark all notifications as read
  router.post(`${base}/api/_notifications/read-all`, async (req: AppRequest, res: AppResponse) => {
    const store = await resolveNotificationStore()
    if (!store) return res.status(404).json({ message: 'Notification store not available.' })

    const userId = extractUserId(req)
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' })

    await store.markAllAsRead(userId)
    return res.json({ ok: true })
  }, mw)

  // GET — unread count only (for polling/badge)
  router.get(`${base}/api/_notifications/count`, async (req: AppRequest, res: AppResponse) => {
    const store = await resolveNotificationStore()
    if (!store) return res.json({ count: 0 })

    const userId = extractUserId(req)
    if (!userId) return res.json({ count: 0 })

    const count = await store.unreadCount(userId)
    return res.json({ count })
  }, mw)
}

/* eslint-enable @typescript-eslint/no-explicit-any */
