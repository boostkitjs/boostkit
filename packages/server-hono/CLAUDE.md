# @rudderjs/server-hono

Hono.js server adapter — implements `ServerAdapter` from `@rudderjs/contracts`.

Normalizes Hono requests/responses, handles Vike SSR integration, WebSocket upgrade patching, and ViewResponse detection (duck-typed via `__rudder_view__`).

Peer of `@rudderjs/core` — never add core to `dependencies` (same cycle rule as router).

`req.ip` is set by `extractIp(c)` in `normalizeRequest()` — reads `x-forwarded-for` / `x-real-ip` headers, normalizes `::1` → `127.0.0.1`. In dev mode, the `rudderjs:ip` Vite plugin injects `x-real-ip` from the Node socket before universal-middleware converts to Web Request.

WebSocket upgrade must be patched at module load time, not lazily.
