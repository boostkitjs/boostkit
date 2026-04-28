---
"@rudderjs/console": patch
"@rudderjs/cli": patch
"@rudderjs/core": patch
"@rudderjs/ai": patch
"@rudderjs/passport": patch
"@rudderjs/broadcast": patch
"@rudderjs/sync": patch
---

**Renamed `@rudderjs/rudder` → `@rudderjs/console`** to match Laravel's `Illuminate\Console` namespace and remove the "rudder rudder" stutter (the binary is `rudder`, the framework is RudderJS, and the authoring package is now `console` — no more triple-naming collision).

**Migration for consumers:**

```ts
// before
import { Rudder, Command } from '@rudderjs/rudder'

// after
import { Rudder, Command } from '@rudderjs/console'
```

**No symbol changes** — `Rudder`, `Command`, `CommandRegistry`, `CommandBuilder`, `MakeSpec`, `CancelledError`, `parseSignature`, `commandObservers` all keep their names. Only the import path changes.

**No CLI changes** — the binary is still `rudder` (`pnpm rudder ...`), and the runner package is still `@rudderjs/cli`. Internal dependency updates only.

**Naming model after this rename:**

| Concept | Package | Surface |
|---|---|---|
| Author HTTP routes | `@rudderjs/router` | `Route.get(...)` |
| Run HTTP routes | `@rudderjs/server-hono` | (boots HTTP server) |
| Author console commands | `@rudderjs/console` | `Rudder.command(...)` |
| Run console commands | `@rudderjs/cli` | `rudder` binary |

The old `@rudderjs/rudder` will be deprecated on npm with a pointer to `@rudderjs/console` after publish.
