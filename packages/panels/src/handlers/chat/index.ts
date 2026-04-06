import type { AppRequest, AppResponse, MiddlewareHandler } from '@rudderjs/core'
import type { Panel } from '../../Panel.js'
import { handlePanelChat } from './chatHandler.js'
import { extractUserId, resolveConversationStore } from './types.js'

export function mountPanelChat(
  router: {
    get(path: string, handler: (req: AppRequest, res: AppResponse) => unknown, mw?: MiddlewareHandler[]): void
    post(path: string, handler: (req: AppRequest, res: AppResponse) => unknown, mw?: MiddlewareHandler[]): void
    delete(path: string, handler: (req: AppRequest, res: AppResponse) => unknown, mw?: MiddlewareHandler[]): void
  },
  panel: Panel,
  mw: MiddlewareHandler[],
) {
  const base = panel.getPath()

  // GET — available models
  router.get(`${base}/api/_chat/models`, async (_req, res) => {
    try {
      const { app } = await import(/* @vite-ignore */ '@rudderjs/core') as { app(): { make(k: string): unknown } }
      const registry = app().make('ai.registry') as { getModels(): Array<{ id: string; label: string }>; getDefault(): string }
      return res.json({ models: registry.getModels(), default: registry.getDefault() })
    } catch {
      return res.json({ models: [], default: '' })
    }
  }, mw)

  // POST — main chat endpoint (SSE stream)
  router.post(`${base}/api/_chat`, async (req, res) => {
    return handlePanelChat(req, res, panel)
  }, mw)

  // GET — list conversations
  router.get(`${base}/api/_chat/conversations`, async (req, res) => {
    const store = await resolveConversationStore()
    if (!store) return res.status(404).json({ message: 'Conversation store not available.' })

    const userId = extractUserId(req)
    const conversations = await store.list(userId)
    return res.json({ conversations })
  }, mw)

  // GET — load a single conversation
  router.get(`${base}/api/_chat/conversations/:id`, async (req, res) => {
    const store = await resolveConversationStore()
    if (!store) return res.status(404).json({ message: 'Conversation store not available.' })

    const id = (req.params as Record<string, string>).id ?? ''
    const userId = extractUserId(req)

    if (userId && store.getMeta) {
      const meta = await store.getMeta(id)
      if (meta && meta.userId && meta.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden.' })
      }
    }

    try {
      const messages = await store.load(id)
      return res.json({ messages })
    } catch {
      return res.status(404).json({ message: 'Conversation not found.' })
    }
  }, mw)

  // DELETE — delete a conversation
  router.delete(`${base}/api/_chat/conversations/:id`, async (req, res) => {
    const store = await resolveConversationStore()
    if (!store) return res.status(404).json({ message: 'Conversation store not available.' })

    const id = (req.params as Record<string, string>).id ?? ''
    const userId = extractUserId(req)

    if (userId && store.getMeta) {
      const meta = await store.getMeta(id)
      if (meta && meta.userId && meta.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden.' })
      }
    }

    try {
      if (store.delete) await store.delete(id)
      return res.json({ ok: true })
    } catch {
      return res.status(404).json({ message: 'Conversation not found.' })
    }
  }, mw)
}
