---
"create-rudder-app": patch
---

Add a `Demos` multiselect option that scaffolds sample views under `/demos` — Contact (CSRF + Zod) always, plus WebSocket chat (`Ws.tsx` + `src/BKSocket.ts`) when `Broadcast` is selected and a Yjs collaborative editor (`Live.tsx` + a `y-websocket` runtime dep) when `Sync` is selected. Wires the matching controllers in `routes/web.ts` and a `POST /api/contact` handler (CSRF-gated when `Auth` is selected) plus `POST /api/ws/broadcast` + `GET /api/ws/ping` when `Broadcast` is selected. Demos use the existing semantic CSS classes so they work in both Tailwind and plain-CSS variants. Silently skipped when the primary framework isn't React (Vue/Solid variants aren't written yet).
