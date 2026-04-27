# @rudderjs/sync

Yjs CRDT real-time document sync engine. Every connected client always sees the same shared state with conflict-free merging — even after going offline and reconnecting. Editor-agnostic core with adapters under subpath exports.

## Installation

```bash
pnpm add @rudderjs/sync
# Client-side (in your app, not this package)
pnpm add yjs y-websocket
```

## Setup

```ts
// bootstrap/providers.ts
import { broadcasting } from '@rudderjs/broadcast'
import { sync }         from '@rudderjs/sync'

export default [
  broadcasting(),  // /ws       — pub/sub channels
  sync(),          // /ws-sync  — Yjs CRDT documents (register after broadcasting)
]
```

## Editor adapters

The core package handles transport, persistence, and the bare Yjs document model. Editor-specific helpers live under subpath exports so they're tree-shakable and don't pull in editor peers unless you import them.

| Adapter | Subpath | Status |
|---|---|---|
| Lexical | `@rudderjs/sync/lexical` | Available |
| Tiptap  | `@rudderjs/sync/tiptap`  | Scaffolded — implementation forthcoming |

```ts
import { sync }                    from '@rudderjs/sync'
import { editBlock, insertBlock }  from '@rudderjs/sync/lexical'

const doc = await sync.document('panel:articles:42:richcontent:body')
insertBlock(doc, 'callToAction', { title: 'Subscribe' })
editBlock(doc, 'callToAction', 0, 'buttonText', 'Learn More')
```

The Lexical adapter exposes free functions that take a `Y.Doc` (or the document handle that `sync.document(name)` returns), so you can wire any background job, queue worker, scheduled task, or webhook into a collaborative document without spinning up a browser.

## Persistence

### Memory (default)

Documents are kept in memory. Resets on server restart. Good for development.

```ts
sync()  // MemoryPersistence used automatically
```

### Redis

Requires `ioredis` (optional peer dependency):

```bash
pnpm add ioredis
```

```ts
import { sync, syncRedis } from '@rudderjs/sync'

sync({
  persistence: syncRedis({ url: process.env.REDIS_URL }),
})
```

Updates are stored as an append-only list per document — efficient writes, full history.

### Prisma

Requires a `SyncDocument` model in your schema:

```prisma
model SyncDocument {
  id        String   @id @default(cuid())
  docName   String
  update    Bytes
  createdAt DateTime @default(now())

  @@index([docName])
}
```

```ts
import { sync, syncPrisma } from '@rudderjs/sync'

sync({
  persistence: syncPrisma({ model: 'syncDocument' }),
})
```

### Custom Adapter

Implement the `SyncPersistence` interface to use any storage backend:

```ts
import type { SyncPersistence } from '@rudderjs/sync'
import * as Y from 'yjs'

const myAdapter: SyncPersistence = {
  async getYDoc(docName)              { /* load and return Y.Doc */ },
  async storeUpdate(docName, update)  { /* persist update bytes */ },
  async getStateVector(docName)       { /* return state vector */ },
  async getDiff(docName, stateVector) { /* return update diff */ },
  async clearDocument(docName)        { /* delete all data */ },
  async destroy()                     { /* cleanup connections */ },
}

sync({ persistence: myAdapter })
```

## Config

```ts
sync({
  /** WebSocket path. Default: '/ws-sync' */
  path: '/ws-sync',

  /** Persistence adapter. Default: MemoryPersistence */
  persistence: syncRedis({ url: process.env.REDIS_URL }),

  /** Auth callback — return true to allow, false to deny */
  onAuth: async (req, docName) => {
    const token = req.headers['authorization']?.split(' ')[1]
    return await verifyToken(token)
  },

  /** Called on every document update */
  onChange: async (docName, update) => {
    console.log(`"${docName}" updated`)
  },
})
```

## Client Usage

`@rudderjs/sync` is **server-side only**. On the client, use standard Yjs packages directly:

```ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc      = new Y.Doc()
const provider = new WebsocketProvider(
  `ws://${window.location.host}/ws-sync`,
  'my-document',  // document name / room
  doc,
)

// Shared text
const text = doc.getText('content')
text.observe(() => {
  console.log('Content:', text.toString())
})

// Edit — all connected clients see the change instantly
doc.transact(() => {
  text.delete(0, text.length)
  text.insert(0, newValue)
})
```

### Awareness (presence, cursors)

```ts
// Set your local state (visible to all other clients)
provider.awareness.setLocalStateField('user', {
  name:   'Alice',
  color:  '#f97316',
  cursor: { index: 42 },
})

// React to others joining, leaving, or moving cursors
provider.awareness.on('change', () => {
  const states = [...provider.awareness.getStates().values()]
  const online = states.flatMap(s => s.user ? [s.user] : [])
  console.log('Online:', online.map(u => u.name))
})
```

### Offline Support

Add `y-indexeddb` for local persistence in the browser:

```bash
pnpm add y-indexeddb
```

```ts
import { IndexeddbPersistence } from 'y-indexeddb'

const local = new IndexeddbPersistence('my-document', doc)
local.on('synced', () => console.log('Local content loaded'))
```

Edits made offline are merged back automatically when the connection restores.

## Sync Facade

The `Sync` facade provides server-side access to ydoc operations without needing to import Yjs directly — useful for server-driven document edits, versioning, and migrations.

```ts
import { Sync } from '@rudderjs/sync'

// Seed a ydoc with initial field data (idempotent — only sets fields not already in the map)
await Sync.seed('panel:articles:abc123', { title: 'Hello', excerpt: 'World' })

// Snapshot the current ydoc state as a Uint8Array
const snapshot = Sync.snapshot('panel:articles:abc123')

// Read all key-value pairs from a named Y.Map
const fields = Sync.readMap('panel:articles:abc123', 'fields')
// => { title: 'Hello', excerpt: 'World' }

// Get the configured persistence adapter
const persistence = Sync.persistence()
```

The facade resolves the persistence adapter from:
1. DI container (`'sync.persistence'` binding) — set by `sync()` provider
2. Global key (`__rudderjs_sync_persistence__`) — fallback

## Observability

If `@rudderjs/telescope` is installed, document open/close events, updates applied, awareness changes (throttled by `liveAwarenessSampleMs` on the telescope config), persistence writes, and sync errors are all recorded under the **Sync** tab. Awareness throttling keeps the entry count bounded even on high-traffic collaborative sessions — default is one awareness sample per 500ms per document.

Nothing to wire up; the sync observer registry ships with the package and Telescope's `SyncCollector` subscribes at boot.

## Rudder Commands

| Command | Description |
|---|---|
| `sync:docs` | List active documents and connected client count |
| `sync:clear <doc>` | Clear a document from memory and persistence |
| `sync:inspect <doc>` | Inspect the Y.Doc tree structure |

## How It Works

`@rudderjs/sync` implements the [y-websocket](https://github.com/yjs/y-websocket) binary sync protocol directly:

1. Client connects → server sends **SyncStep1** (server state vector)
2. Client replies with **SyncStep2** (diff of what it has that the server doesn't)
3. Client sends its own **SyncStep1** → server replies with diff
4. Both sides are now in sync
5. Subsequent edits flow as **Update** messages, broadcast to all room clients
6. **Awareness** messages are broadcast as-is (no persistence)

The server maintains one in-memory `Y.Doc` per document name (room). Updates are also written to the configured persistence adapter so new clients receive the full document state on connect.

## Migration from `@rudderjs/live`

This package was renamed in `0.1.0` to better reflect its purpose (sync engine, not just "live updates"). Lexical-specific helpers moved to `@rudderjs/sync/lexical`. See the [package README](https://github.com/rudderjs/rudder/blob/main/packages/sync/README.md#migration-from-rudderjslive) for the full rename table.
