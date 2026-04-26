# `@rudderjs/sync/tiptap` — integration plan

> **Status:** scaffolded (interface + throwing stubs). Not implemented.
> **Tracking:** `docs/plans/2026-04-26-rename-live-to-sync.md` (Phase 4 + follow-up).

## Why a subpath, not a separate package

Tiptap support shares the core `@rudderjs/sync` Yjs engine, transport, and persistence. Splitting it into its own npm package would force consumers to install two packages that always travel together. A subpath export (`@rudderjs/sync/tiptap`) carries the editor-specific helpers without paying that cost.

If the Tiptap helpers ever grow heavy peer deps (e.g. shipping `prosemirror-y-binding` runtime adapters that pull in the full `prosemirror-*` graph) we revisit and split — but only then, not preemptively.

## Tiptap collaboration model in 60 seconds

- Tiptap binds to Yjs via the [`Collaboration`](https://tiptap.dev/docs/editor/extensions/functionality/collaboration) extension, which delegates to `y-prosemirror`.
- The collaborative state lives in a single `Y.XmlFragment` on the `Y.Doc`.
- The fragment field name is configurable via `Collaboration.configure({ fragmentField: 'default' })`. Default is `'default'`.
- Awareness is the standard `y-protocols/awareness` channel, same as Lexical.
- Document position is **ProseMirror position**, not byte offset — different from Lexical's tree-walk indices.

## Mapping to the Lexical adapter

| Operation | Lexical (`@rudderjs/sync/lexical`) | Tiptap (this subpath) |
|---|---|---|
| Read whole doc as text | `readText(doc)` | `readDoc(doc)` returns ProseMirror JSON |
| Insert structured block | `insertBlock(doc, type, props, index?)` | `insertNode(doc, position, node)` |
| Remove a block | `removeBlock(doc, type, index)` | `removeNode(doc, position)` |
| Edit a block field | `editBlock(doc, type, index, field, value)` | (no direct equivalent — express via `insertNode`/`removeNode` of attrs) |
| Surgical text edit | `editText(doc, ops)` | `editText(doc, { from, to, insert })` |
| AI cursor awareness | `setAiAwareness(doc, { ... })` | `setAiAwareness(doc, { cursor, selection })` |
| Clear AI awareness | `clearAiAwareness(doc)` | `clearAiAwareness(doc)` |

The Lexical adapter walks a tree of `Y.XmlElement` blocks under `Y.XmlText` paragraphs. Tiptap's `Y.XmlFragment` is a flatter ProseMirror-shaped tree — the equivalent of a Lexical "block at index N" is "node at ProseMirror position P", which the caller has to compute (or you expose helpers like `findNodeOfType(doc, type, n)`).

## Peer dependencies (when implemented)

Add to `@rudderjs/sync`'s `optionalDependencies`:

```json
"y-prosemirror":                       "^1.2.0",
"@tiptap/extension-collaboration":     "^2.0.0",
"prosemirror-model":                   "^1.20.0",
"prosemirror-state":                   "^1.4.0",
"prosemirror-transform":               "^1.10.0"
```

These are runtime-loaded via dynamic import in the adapter so projects that don't use Tiptap don't pay the install cost.

## Acceptance criteria for "v1 implemented"

Drop the throwing-stub guard when **all** of:

1. `readDoc(doc)` round-trips through ProseMirror JSON without losing attrs/marks/content.
2. `insertNode(doc, position, node)` produces the same `Y.XmlFragment` state as a client-side Tiptap edit at the same position.
3. `removeNode(doc, position)` is consistent with Tiptap's `editor.commands.deleteRange()`.
4. `editText(doc, { from, to, insert })` matches Tiptap's `insertContentAt` semantics (replaces range with text).
5. `setAiAwareness` / `clearAiAwareness` use the same `client id 999999999` reserved by `@rudderjs/sync` so Telescope's awareness sample throttling continues to work.
6. The adapter's tests run inside `pnpm test` using the same `tsc -p tsconfig.test.json && node --test` pattern as Lexical (`packages/sync/src/lexical/index.test.ts`).
7. README at the package root (`packages/sync/README.md`) "Editor Adapters" section flips Tiptap from "Scaffolded" to "Available".

## Out of scope for v1

- BlockNote (separate adapter, layer on top of Tiptap)
- Tiptap Pro extensions (DocumentManager, etc.) — proprietary, not our concern
- Real-time React/Vue components — those are the consumer's problem; this subpath is server-side mutation only
