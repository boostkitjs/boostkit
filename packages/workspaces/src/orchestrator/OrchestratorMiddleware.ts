import type { AiMiddleware } from '@boostkit/ai'

/**
 * Broadcast middleware — streams all chunks to a WebSocket channel.
 *
 * Uses `@boostkit/broadcast` (dynamically imported to avoid hard dependency).
 * Clients subscribe to the channel to receive real-time stream chunks.
 *
 * @example
 * const orchestrator = new Orchestrator({
 *   ...options,
 *   middleware: [broadcastMiddleware(`private-workspace.${workspaceId}`)],
 * })
 */
export function broadcastMiddleware(channel: string): AiMiddleware {
  return {
    name: 'broadcast',

    onChunk(ctx, chunk) {
      import('@boostkit/broadcast').then(({ broadcast }) => {
        broadcast(channel, 'stream:chunk', chunk)
      }).catch(() => {})
      return chunk
    },

    async onFinish(ctx) {
      import('@boostkit/broadcast').then(({ broadcast }) => {
        broadcast(channel, 'stream:finish', { requestId: ctx.requestId })
      }).catch(() => {})
    },

    async onError(ctx, error) {
      import('@boostkit/broadcast').then(({ broadcast }) => {
        broadcast(channel, 'stream:error', {
          requestId: ctx.requestId,
          error: error instanceof Error ? error.message : String(error),
        })
      }).catch(() => {})
    },
  }
}
