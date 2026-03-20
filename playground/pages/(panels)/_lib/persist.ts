/** Persist mode for UI state. */
export type PersistMode = false | 'localStorage' | 'url' | 'session'

/**
 * Read persisted state from client-side storage.
 * Call only on the client (typeof window !== 'undefined').
 */
export function readClientState(
  mode: PersistMode,
  storeKey: string,
  urlPrefix?: string,
): Record<string, unknown> {
  if (typeof window === 'undefined') return {}

  if (mode === 'localStorage') {
    try {
      const stored = localStorage.getItem(storeKey)
      if (stored) return JSON.parse(stored)
    } catch { /* ignore */ }
  }

  if (mode === 'url') {
    const url = new URL(window.location.href)
    const prefix = urlPrefix ?? storeKey
    const state: Record<string, unknown> = {}
    for (const [k, v] of url.searchParams.entries()) {
      if (k.startsWith(`${prefix}_`)) {
        state[k.slice(prefix.length + 1)] = v
      }
    }
    return state
  }

  return {}
}

/**
 * Save state to client-side storage.
 * For session mode, fires a POST to the server.
 */
export function saveClientState(
  mode: PersistMode,
  storeKey: string,
  state: Record<string, unknown>,
  opts?: {
    pathSegment?: string
    apiPath?: string       // e.g. '/_tables/:id/remember'
    urlPrefix?: string
  },
): void {
  if (!mode) return

  if (mode === 'localStorage' && typeof window !== 'undefined') {
    localStorage.setItem(storeKey, JSON.stringify(state))
    return
  }

  if (mode === 'url' && typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    const prefix = opts?.urlPrefix ?? storeKey
    // Remove all existing params with this prefix (cleans up stale keys like cleared filters)
    const toDelete: string[] = []
    for (const key of url.searchParams.keys()) {
      if (key.startsWith(`${prefix}_`)) toDelete.push(key)
    }
    for (const key of toDelete) url.searchParams.delete(key)
    // Set new params
    for (const [k, v] of Object.entries(state)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(`${prefix}_${k}`, String(v))
      }
    }
    window.history.replaceState(null, '', url.pathname + url.search)
    return
  }

  if (mode === 'session' && opts?.pathSegment && opts?.apiPath) {
    fetch(`/${opts.pathSegment}${opts.apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {})  // fire-and-forget
  }
}

/** Slugify for URL param values. */
export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
