---
"@rudderjs/contracts": minor
"@rudderjs/orm": patch
---

Add `ModelLike` + `ModelQuery` interfaces to `@rudderjs/contracts` so downstream
tools (e.g. `@pilotiq/pilotiq` for auto-wired CRUD) can target the Eloquent-style
Model surface without depending on `@rudderjs/orm` directly. `Model` from
`@rudderjs/orm` already structurally satisfies `ModelLike`, asserted at compile
time via a `const _: ModelLike = Model` guard in `@rudderjs/orm`'s entry — any
future change to `Model` that breaks the contract fails the build.
