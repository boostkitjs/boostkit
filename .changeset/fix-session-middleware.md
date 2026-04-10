---
'create-rudder-app': patch
---

Fix auth template: add sessionMiddleware to bootstrap/app.ts when auth is enabled.

The generated app was calling Auth.user() which requires session context,
but sessionMiddleware was never registered in the middleware pipeline.
