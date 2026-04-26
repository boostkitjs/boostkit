# Real-time

RudderJS ships two real-time packages that share the same port and process as your HTTP server:

| Package | Purpose |
|---|---|
| `@rudderjs/broadcast` | Channel-based pub/sub — events, notifications, presence |
| `@rudderjs/sync` | Yjs CRDT — collaborative editing, shared document state |

---

## Broadcasting (`@rudderjs/broadcast`)

Channel-based WebSocket pub/sub with public, private, and presence channels. No Pusher, no Echo, no external service.

### Installation

```bash
pnpm add @rudderjs/broadcast
```

### Setup

**1. Register the provider:**

```ts
// bootstrap/providers.ts
import { broadcasting } from '@rudderjs/broadcast'

export default [
  // ... other providers
  broadcasting(),
]
```

**2. Add a channels route loader:**

```ts
// bootstrap/app.ts
export default Application.configure({ ... })
  .withRouting({
    web:      () => import('../routes/web.ts'),
    api:      () => import('../routes/api.ts'),
    channels: () => import('../routes/channels.ts'),
  })
  .create()
```

**3. Register auth callbacks:**

```ts
// routes/channels.ts
import { Broadcast } from '@rudderjs/broadcast'

Broadcast.channel('private-orders.*', async (req) => {
  const user = await getUserFromToken(req.token)
  return !!user
})

Broadcast.channel('presence-room.*', async (req) => {
  const user = await getUserFromToken(req.token)
  if (!user) return false
  return { id: user.id, name: user.name }
})
```

### Channel Types

| Type | Prefix | Auth |
|---|---|---|
| Public | — | None — anyone can subscribe |
| Private | `private-` | Auth callback must return `true` |
| Presence | `presence-` | Auth callback returns member info object |

### Broadcasting Events

Push events from anywhere on the server — route handlers, jobs, service classes:

```ts
import { broadcast } from '@rudderjs/broadcast'

// Inside a route
Route.post('/orders/:id/ship', async (req) => {
  await shipOrder(req.params.id)
  broadcast(`orders.${req.params.id}`, 'order.shipped', { id: req.params.id })
  return { ok: true }
})
```

### Auth Callbacks

Private and presence channels require an auth callback registered with `Broadcast.channel()`:

```ts
import { Broadcast } from '@rudderjs/broadcast'

// Private — return true/false
Broadcast.channel('private-user.*', async (req, channel) => {
  // req.headers — HTTP headers from the WebSocket upgrade request
  // req.url     — upgrade request URL
  // req.token   — token from the client's subscribe message
  const user = await verifyToken(req.token)
  return !!user
})

// Presence — return a member info object
Broadcast.channel('presence-room.*', async (req) => {
  const user = await verifyToken(req.token)
  if (!user) return false
  return { id: user.id, name: user.name, avatar: user.avatar }
})
```

The pattern supports `*` as a wildcard (matches non-dot characters). Use `private-user.*` to match `private-user.1`, `private-user.42`, etc.

### Client (BKSocket)

Publish the client to your project:

```bash
pnpm rudder vendor:publish --tag=broadcast-client
```

Then use it in your frontend pages:

```ts
import { BKSocket } from './vendor/BKSocket'

const socket = new BKSocket('ws://localhost:3000/ws')

// Public channel
const chat = socket.channel('chat')
chat.on('new-message', (data) => {
  console.log(data.text)
})

// Private channel
const orders = socket.private(`orders.${orderId}`, userToken)
orders.on('order.shipped', (data) => {
  showNotification(`Order ${data.id} has shipped!`)
})

// Send to other subscribers (client events)
chat.emit('typing', { user: 'Alice' })

// Presence channel
const room = socket.presence('room.lobby', userToken)
room.on('presence.members', ({ members }) => {
  console.log('Online:', members)
})
room.on('presence.joined', ({ user }) => {
  console.log(`${user.name} joined`)
})
room.on('presence.left', ({ user }) => {
  console.log(`${user.name} left`)
})

// Leave a channel
orders.leave()
```

BKSocket automatically reconnects after 3 seconds if the connection drops, and resubscribes to all active channels on reconnect.

### Stats

```ts
import { broadcastStats } from '@rudderjs/broadcast'

const { connections, channels } = broadcastStats()
```

```bash
pnpm rudder broadcast:connections
```

---

## Real-time Document Sync (`@rudderjs/sync`)

Yjs CRDT document sync — every client always sees the same shared state, with conflict-free merging even when offline. Editor-agnostic core with adapters under subpath exports.

### Installation

```bash
pnpm add @rudderjs/sync
# Client side
pnpm add yjs y-websocket
```

### Setup

```ts
// bootstrap/providers.ts
import { broadcasting } from '@rudderjs/broadcast'
import { sync }         from '@rudderjs/sync'

export default [
  broadcasting(),  // /ws       — pub/sub channels
  sync(),          // /ws-sync  — Yjs CRDT documents
]
```

### Persistence

By default documents are kept in memory (resets on restart). For production, use a persistence adapter:

```ts
import { sync, syncRedis, syncPrisma } from '@rudderjs/sync'

// Redis — append-only log per document
sync({ persistence: syncRedis({ url: process.env.REDIS_URL }) })

// Prisma — store updates in a database table
sync({ persistence: syncPrisma() })
```

### Auth

```ts
sync({
  onAuth: async (req, docName) => {
    const token = req.headers['authorization']?.split(' ')[1]
    return await verifyToken(token)
  },
})
```

### onChange

Called whenever a document is updated — useful for indexing or webhooks:

```ts
sync({
  onChange: async (docName, update) => {
    console.log(`Document "${docName}" updated`)
  },
})
```

### Editor adapters

The core `@rudderjs/sync` package handles transport + persistence. For server-side mutations against editor-specific document shapes, import the matching adapter from a subpath:

| Adapter | Subpath | Status |
|---|---|---|
| Lexical | `@rudderjs/sync/lexical` | Available |
| Tiptap  | `@rudderjs/sync/tiptap`  | Scaffolded — implementation forthcoming |

```ts
import { sync }                    from '@rudderjs/sync'
import { editBlock, insertBlock }  from '@rudderjs/sync/lexical'

const doc = await sync.document('panel:articles:42:richcontent:body')
insertBlock(doc, 'callToAction', { title: 'Subscribe' })
```

### Client

`@rudderjs/sync` is server-side only. On the client use standard Yjs packages:

```ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc      = new Y.Doc()
const provider = new WebsocketProvider('ws://localhost:3000/ws-sync', 'my-doc', doc)

// Collaborative text
const text = doc.getText('content')
text.observe(() => console.log(text.toString()))

// Awareness — who is online, cursor positions
provider.awareness.setLocalStateField('user', { name: 'Alice', color: '#f00' })
provider.awareness.on('change', () => {
  const states = [...provider.awareness.getStates().values()]
  console.log('Online:', states.map(s => s.user?.name))
})
```

### Rudder Commands

| Command | Description |
|---|---|
| `sync:docs` | List active documents and connected client count |
| `sync:clear <doc>` | Clear a document from persistence |
| `sync:inspect <doc>` | Inspect the Y.Doc tree structure |

---

## How It Works

Both packages hook into Node.js HTTP `upgrade` events on your existing server — no separate port or process needed.

- **Dev (Vite):** `@rudderjs/vite` monkey-patches `http.createServer` to intercept srvx's server and attach the upgrade handler
- **Production:** `@rudderjs/server-hono`'s `listen()` attaches the handler to the HTTP server after `serve()` starts

The chain: HTTP server → `@rudderjs/broadcast` handles `/ws` → `@rudderjs/sync` handles `/ws-sync` → Vite HMR handles the rest.
