import type { ConversationStoreLike } from './types.js'
import { loadAi } from './lazyImports.js'

export async function generateConversationTitle(
  store: ConversationStoreLike,
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
) {
  try {
    const { agent: agentFn } = await loadAi()
    const a = agentFn('Generate a short title (max 6 words) for this conversation. Return ONLY the title text, nothing else.')
    const result = await a.prompt(`User: ${userMessage}\nAssistant: ${assistantMessage.slice(0, 500)}`)
    const title = result.text.trim().replace(/^["']|["']$/g, '')
    if (title) await store.setTitle(conversationId, title)
  } catch { /* non-critical — title stays as default */ }
}
