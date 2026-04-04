import type { AiMessage, ConversationStore, ConversationStoreMeta } from '@rudderjs/ai'

// ── Minimal structural types for the Prisma client ──

interface PrismaConversationClient {
  aiConversation: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>
    findUnique(args: { where: Record<string, unknown>; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null>
    findMany(args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown>; take?: number; select?: Record<string, unknown> }): Promise<Array<Record<string, unknown>>>
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>
    delete(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>>
  }
  aiChatMessage: {
    createMany(args: { data: Array<Record<string, unknown>> }): Promise<unknown>
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Array<Record<string, unknown>>>
  }
}

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

async function resolvePrisma(): Promise<PrismaConversationClient> {
  const { app } = await import(/* @vite-ignore */ '@rudderjs/core') as { app(): { make(k: string): unknown } }
  return app().make('prisma') as PrismaConversationClient
}

export class PrismaConversationStore implements ConversationStore {

  async create(title?: string, meta?: ConversationStoreMeta): Promise<string> {
    const id = generateId()
    await (await resolvePrisma()).aiConversation.create({
      data: {
        id,
        title: title ?? 'New conversation',
        userId: meta?.userId,
        resourceSlug: meta?.resourceSlug,
        recordId: meta?.recordId,
      },
    })
    return id
  }

  async load(conversationId: string): Promise<AiMessage[]> {
    const rows = await (await resolvePrisma()).aiChatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((row) => {
      const msg: AiMessage = {
        role: row.role as AiMessage['role'],
        content: row.content as string,
      }
      if (row.toolCallId) msg.toolCallId = row.toolCallId as string
      if (row.toolCalls) {
        try { msg.toolCalls = JSON.parse(row.toolCalls as string) } catch { /* ignore */ }
      }
      return msg
    })
  }

  async append(conversationId: string, messages: AiMessage[]): Promise<void> {
    const prisma = await resolvePrisma()
    const data = messages.map((m) => ({
      id: generateId(),
      conversationId,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls ? JSON.stringify(m.toolCalls) : null,
      toolCallId: m.toolCallId ?? null,
    }))

    await prisma.aiChatMessage.createMany({ data })
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })
  }

  async setTitle(conversationId: string, title: string): Promise<void> {
    await (await resolvePrisma()).aiConversation.update({
      where: { id: conversationId },
      data: { title },
    })
  }

  async list(userId?: string): Promise<{ id: string; title: string; createdAt: Date; updatedAt?: Date }[]> {
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId

    const rows = await (await resolvePrisma()).aiConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })

    return rows as { id: string; title: string; createdAt: Date; updatedAt?: Date }[]
  }

  async listForResource(
    resourceSlug: string,
    recordId?: string,
    userId?: string,
  ): Promise<{ id: string; title: string; createdAt: Date; updatedAt?: Date }[]> {
    const where: Record<string, unknown> = { resourceSlug }
    if (recordId) where.recordId = recordId
    if (userId) where.userId = userId

    const rows = await (await resolvePrisma()).aiConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })

    return rows as { id: string; title: string; createdAt: Date; updatedAt?: Date }[]
  }

  async delete(conversationId: string): Promise<void> {
    await (await resolvePrisma()).aiConversation.delete({
      where: { id: conversationId },
    })
  }
}
