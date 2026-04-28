---
---

Configure changesets to only cascade peer-dependency bumps when the new version is out of the existing range (`onlyUpdatePeerDependentsWhenOutOfRange: true`). Stops in-range peer minor/patch updates from triggering spurious major bumps on dependents.

Verified locally: a hypothetical `@rudderjs/mcp: minor` bump (3.0.x → 3.1.0) used to cascade `@rudderjs/telescope` to MAJOR despite the new mcp version satisfying telescope's existing `^3.0.0` peer range. With the flag, it now correctly leaves telescope alone. Out-of-range cascades (e.g. `@rudderjs/mcp: major`) still propagate as intended.
