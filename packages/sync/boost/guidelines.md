# @rudderjs/sync

## Overview

Real-time collaborative document sync engine via [Yjs](https://yjs.dev) CRDT. Every connected client always sees the same shared state with conflict-free merging — even after going offline and reconnecting. Works alongside `@rudderjs/broadcast` on the same port. Server-side only — clients use standard Yjs packages (`yjs`, `y-websocket`) directly.

Editor-specific helpers (block/text mutations) live under subpath exports: `@rudderjs/sync/lexical` (available), `@rudderjs/sync/tiptap` (scaffolded).

## Key Patterns

### Setup

```ts
// bootstrap/providers.ts
import { broadcasting } from '@rudderjs/broadcast'
import { sync }         from '@rudderjs/sync'

export default [
  broadcasting(),   // /ws       pub/sub channels
  sync(),           // /ws-sync  Yjs CRDT documents (register AFTER broadcasting)
]
```

### Persistence drivers

```ts
// Memory (default) — resets on restart, good for dev
sync()

// Redis — updates append-only per document, fast writes, full history
import { sync, syncRedis } from '@rudderjs/sync'
sync({ persistence: syncRedis({ url: process.env.REDIS_URL }) })

// Prisma — durable, queryable from SQL
import { sync, syncPrisma } from '@rudderjs/sync'
sync({ persistence: syncPrisma({ model: 'syncDocument' }) })
```

For Prisma, add the `SyncDocument` model to your schema:

```prisma
model SyncDocument {
  id        String   @id @default(cuid())
  docName   String
  update    Bytes
  createdAt DateTime @default(now())
}
```

### Config

```ts
sync({
  path:       '/ws-sync',          // default
  persistence: syncRedis({ ... }),
  onAuth: async (req, docName) => {
    return verifyToken(req.headers['authorization']?.split(' ')[1])
  },
  onChange: async (docName, update) => {
    console.log(`"${docName}" updated (${update.length} bytes)`)
  },
})
```

### Client usage

```ts
// Client side — plain Yjs + y-websocket
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const provider = new WebsocketProvider(
  `ws://${window.location.host}/ws-sync`,
  'room-name',
  doc,
)

const text = doc.getText('content')
text.observe(() => console.log(text.toString()))
doc.transact(() => text.insert(0, 'Hello'))
```

### Awareness (presence, cursors)

```ts
provider.awareness.setLocalStateField('user', {
  name:  'Alice',
  color: '#f97316',
  cursor: { index: 42 },
})

provider.awareness.on('change', () => {
  const online = [...provider.awareness.getStates().values()]
    .flatMap(s => s.user ? [s.user] : [])
})
```

### Offline support

```bash
pnpm add y-indexeddb
```

```ts
import { IndexeddbPersistence } from 'y-indexeddb'
const local = new IndexeddbPersistence('room-name', doc)
```

Edits made offline merge back automatically when the connection restores — CRDTs handle reconciliation.

### Sync facade (server-side ydoc access)

```ts
import { Sync } from '@rudderjs/sync'

await Sync.seed('panel:articles:abc123', { title: 'Hello', excerpt: 'World' })
const snapshot = Sync.snapshot('panel:articles:abc123')
const fields = Sync.readMap('panel:articles:abc123', 'fields')
```

Useful for server-driven document edits, versioning, and migrations. Resolves persistence via DI (`'sync.persistence'` binding) or the `__rudderjs_sync_persistence__` globalThis fallback.

### Editor adapters

For server-side mutations against editor-specific document shapes, import from the relevant adapter subpath:

```ts
import { sync }                              from '@rudderjs/sync'
import { editBlock, insertBlock, editText }  from '@rudderjs/sync/lexical'

const doc = await sync.document('panel:articles:abc123:richcontent:body')
insertBlock(doc, 'callToAction', { title: 'Subscribe' })
editText(doc, { from: 0, to: 5, insert: 'Hi' })
```

Tiptap support: `@rudderjs/sync/tiptap` is scaffolded — interface-only until the implementation lands.

### Observability

If `@rudderjs/telescope` is installed, document opens/closes, updates applied, awareness changes (throttled by `liveAwarenessSampleMs` — default 500ms), persistence writes, and sync errors record under the **Sync** tab. No config needed.

## Common Pitfalls

- **`sync()` before `broadcasting()`.** `sync` shares the WS upgrade handler with broadcast. Registration order: `broadcasting()` → `sync()`.
- **Awareness without throttling.** Mouse movement triggers awareness updates at ~60fps. Without throttling, the telescope entry count explodes on high-traffic rooms. `liveAwarenessSampleMs` in telescope config throttles collection side; y-awareness itself doesn't throttle client-side.
- **Forgetting `ioredis` for Redis persistence.** Optional peer — install: `pnpm add ioredis`.
- **Custom persistence adapter — implement all 6 methods.** `getYDoc`, `storeUpdate`, `getStateVector`, `getDiff`, `clearDocument`, `destroy`. Missing any throws at first use.
- **`Sync.seed()` on already-seeded docs.** Idempotent — only sets fields not already in the map. Won't overwrite existing data. For full replacement, use `Sync.clearDocument()` first.
- **Client using standard y-websocket over plain WS.** Works in dev. In production behind a reverse proxy, ensure the proxy supports WS upgrades (nginx `proxy_set_header Upgrade $http_upgrade` + `Connection "upgrade"`).
- **Editor block ops on the core facade.** `Sync.editBlock`/`insertBlock`/`removeBlock` (formerly on the `Live` facade) moved to `@rudderjs/sync/lexical` as standalone functions taking a `Y.Doc`. Use `sync.document(name)` to get the handle.

## Key Imports

```ts
import { sync, syncRedis, syncPrisma, Sync } from '@rudderjs/sync'

import type { SyncConfig, SyncPersistence } from '@rudderjs/sync'

// Editor-specific helpers (Lexical)
import { editBlock, insertBlock, removeBlock, editText } from '@rudderjs/sync/lexical'
```
