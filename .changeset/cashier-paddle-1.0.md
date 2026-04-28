---
---

Initial release: **`@rudderjs/cashier-paddle@1.0.0`** — Paddle billing for RudderJS apps.

Mix `Billable` into your User model for checkout sessions, subscription state, refunds, pricing previews, and a signed webhook receiver. Includes Prisma schema fragment, React checkout button + inline checkout components, and `cashier:install` / `cashier:webhook` / `cashier:sync` CLI commands.

**Why 1.0 from day one:** the package is a port of Laravel's Cashier-Paddle — its surface is well-defined and stable. Starting at `1.0.0` means dependents' `^1.0.0` peer ranges will absorb all future minor/patch bumps without cascading major bumps (the cascade trap that hits 0.x packages under semver caret rules).
