// ─── Chat Element Meta ───────────────────────────────────

export interface ChatElementMeta {
  type: 'chat'
  id: string
  collaborative: boolean
  persist: boolean
  height: number | null
}

// ─── Chat Schema Element ─────────────────────────────────

/**
 * Chat — schema element for embedding a workspace chat interface.
 *
 * Connects to the workspace orchestrator for multi-agent conversations.
 * Streams responses in real-time via WebSocket broadcast.
 *
 * @example
 * // In a page schema or resource detail
 * Chat.make('workspace-chat')
 *   .collaborative()    // multiple users see the same conversation
 *   .persist()          // save conversation in localStorage
 *
 * // With custom height (embedded mode)
 * Chat.make('workspace-chat')
 *   .height(500)
 */
export class Chat {
  private _id: string
  private _collaborative = false
  private _persist = false
  private _height: number | null = null

  private constructor(id: string) {
    this._id = id
  }

  static make(id: string): Chat {
    return new Chat(id)
  }

  /** Enable real-time collaborative chat via Yjs — all users see the same conversation. */
  collaborative(): this {
    this._collaborative = true
    return this
  }

  /** Persist conversation history in localStorage. */
  persist(): this {
    this._persist = true
    return this
  }

  /** Set a fixed height (for embedded mode). Null = fills available space. */
  height(px: number): this {
    this._height = px
    return this
  }

  // ─── Internal ────────────────────────────────────────

  getId(): string { return this._id }
  isCollaborative(): boolean { return this._collaborative }
  isPersist(): boolean { return this._persist }
  getHeight(): number | null { return this._height }

  getType(): 'chat' { return 'chat' }

  toMeta(): ChatElementMeta {
    return {
      type: 'chat',
      id: this._id,
      collaborative: this._collaborative,
      persist: this._persist,
      height: this._height,
    }
  }
}
