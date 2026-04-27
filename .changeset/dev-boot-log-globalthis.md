---
"@rudderjs/core": patch
---

Fix the dev-mode "providers loaded" boot log occasionally not printing. The cached list of last-loaded provider entries lived in a module-level `let`, which Vite SSR can isolate across module instances — `defaultProviders()` would write to one copy and `Application._bootstrapProviders()` would read an empty array from another, silently skipping the log. Moved the cache to `globalThis['__rudderjs_last_loaded_providers__']`, matching the pattern already used for the singleton app instance and other cross-module state.
