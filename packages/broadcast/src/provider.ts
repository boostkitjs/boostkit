import { ServiceProvider, rudder, config } from '@rudderjs/core'
import {
  initWsServer,
  getUpgradeHandler,
  registerAuth,
  broadcastStats,
  type AuthCallback,
} from './ws-server.js'

// ─── Config ─────────────────────────────────────────────────

export interface BroadcastConfig {
  /** URL path the WebSocket server listens on (default: `/ws`) */
  path?: string
}

// ─── globalThis key for the upgrade handler ─────────────────

export const UPGRADE_KEY = '__rudderjs_ws_upgrade__'

// ─── Broadcast facade ────────────────────────────────────────

/**
 * Broadcast facade — register channel auth callbacks.
 *
 * @example
 * // routes/channels.ts
 * import { Broadcast } from '@rudderjs/broadcast'
 *
 * Broadcast.channel('private-orders.*', async (req, channel) => {
 *   return req.token === 'valid'
 * })
 *
 * Broadcast.channel('presence-room.*', async (req) => {
 *   return { id: 'user-1', name: 'Alice' }  // member info
 * })
 */
export const Broadcast = {
  /**
   * Register a channel auth callback.
   *
   * Pattern supports `*` as a single-segment wildcard:
   *   `'private-orders.*'` matches `'private-orders.123'`
   *
   * Return `true`/`false` for private channels.
   * Return a member-info object (or `false`) for presence channels.
   */
  channel: registerAuth as (pattern: string, callback: AuthCallback) => void,
}

// ─── Provider ───────────────────────────────────────────────

export class BroadcastingProvider extends ServiceProvider {
  register(): void {}

  async boot(): Promise<void> {
    const cfg  = config<BroadcastConfig>('broadcast', {})
    const path = cfg.path ?? '/ws'

    initWsServer()

      // Register upgrade handler on globalThis so @rudderjs/vite and
      // @rudderjs/server-hono can attach it to the http.Server without
      // a hard dependency on @rudderjs/broadcast.
      // Store both the broadcast-specific handler AND the combined handler
      // so that @rudderjs/sync can chain without circular references on HMR.
      const handler = getUpgradeHandler(path)
      ;(globalThis as Record<string, unknown>)['__rudderjs_ws_broadcast_upgrade__'] = handler
      ;(globalThis as Record<string, unknown>)[UPGRADE_KEY] = handler

      this.publishes({
        from: new URL(/* @vite-ignore */ '../client', import.meta.url).pathname,
        to:   'src',
        tag:  'broadcast-client',
      })

    rudder.command('broadcast:connections', () => {
      const { connections, channels } = broadcastStats()
      console.log(`\n  Active connections : ${connections}`)
      console.log(`  Active channels    : ${channels}\n`)
    }).description('Show active WebSocket connection stats')
  }
}
