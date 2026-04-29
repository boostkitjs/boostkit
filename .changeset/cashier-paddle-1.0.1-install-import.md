---
"@rudderjs/cashier-paddle": patch
---

Fix `cashier:install` command — `dist/commands/install.js` referenced `@rudderjs/rudder` (renamed to `@rudderjs/console` in v0.0.4) and tried to call a non-existent `runVendorPublish` export, breaking SSR builds and leaving the `cashier:install` command broken at runtime. The dead programmatic-fallback path is gone; the command now just prints the canonical install steps for the user to run.
