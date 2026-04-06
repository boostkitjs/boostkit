import type { AppRequest } from '@rudderjs/core'

export interface ChatRequestBody {
  message:          string
  conversationId?:  string
  model?:           string
  history?:         Array<{ role: 'user' | 'assistant'; content: string }>
  resourceContext?: { resourceSlug: string; recordId: string }
  forceAgent?:      string
  selection?:       { field: string; text: string }
}

export interface ConversationStoreLike {
  create(title?: string, meta?: { userId?: string | undefined; resourceSlug?: string | undefined; recordId?: string | undefined }): Promise<string>
  load(conversationId: string): Promise<Array<{ role: string; content: string; toolCallId?: string; toolCalls?: unknown[] }>>
  append(conversationId: string, messages: Array<{ role: string; content: string; toolCallId?: string; toolCalls?: unknown[] }>): Promise<void>
  setTitle(conversationId: string, title: string): Promise<void>
  list(userId?: string): Promise<Array<{ id: string; title: string; createdAt: Date; updatedAt?: Date }>>
  delete?(conversationId: string): Promise<void>
  getMeta?(conversationId: string): Promise<{ userId?: string } | null>
  listForResource?(resourceSlug: string, recordId?: string, userId?: string): Promise<Array<{ id: string; title: string; createdAt: Date; updatedAt?: Date }>>
}

export type SSESend = (event: string, data: unknown) => void

export function extractUserId(req: AppRequest): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = req as any
  return r.user?.id ?? r.session?.get?.('userId') ?? undefined
}

export async function resolveConversationStore(): Promise<ConversationStoreLike | null> {
  try {
    const { app } = await import(/* @vite-ignore */ '@rudderjs/core') as { app(): { make(k: string): unknown } }
    return app().make('ai.conversations') as ConversationStoreLike
  } catch { return null }
}

export function createSSEStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array>

  const readable = new ReadableStream<Uint8Array>({
    start(c) { controller = c },
  })

  const send: SSESend = (event, data) => {
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    } catch { /* stream closed */ }
  }

  const close = () => {
    try { controller.close() } catch { /* already closed */ }
  }

  return { readable, send, close }
}
