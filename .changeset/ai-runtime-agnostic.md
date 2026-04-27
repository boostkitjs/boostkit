---
"@rudderjs/ai": minor
"@rudderjs/core": patch
---

Make `@rudderjs/ai` runtime-agnostic via subpath exports. The main entry now works
in any `fetch`-capable JS runtime — Node, browser, Electron (main and renderer),
React Native — with zero `node:*` static imports (enforced by an isomorphism guard
test). Node-only filesystem helpers (`documentFromPath`, `imageFromPath`,
`transcribeFromPath`) move to `@rudderjs/ai/node`. The `AiProvider` `ServiceProvider`
moves to `@rudderjs/ai/server` and `@rudderjs/core` is now an optional peer — only
`/server` consumers pull it in.

`@rudderjs/core` gains a new `rudderjs.providerSubpath` field on the provider
manifest. When set, `defaultProviders()` imports the provider class from the given
subpath (`@rudderjs/ai` declares `"./server"`) instead of the package's main entry.
This is fully auto-discovered — no app changes needed.

**Breaking changes (uncommon import paths only):**
- `import { AiProvider } from '@rudderjs/ai'` → `from '@rudderjs/ai/server'` (most apps use `defaultProviders()` which finds it automatically)
- `Image.fromPath()` / `Document.fromPath()` / `Transcription.fromPath()` removed — use `imageFromPath` / `documentFromPath` / `transcribeFromPath` from `@rudderjs/ai/node`
- `AI.transcribe(path: string)` is now `AI.transcribe(bytes: Uint8Array)` — load paths via `transcribeFromPath` from `@rudderjs/ai/node`
- `Transcription.fromBuffer(Buffer)` aliased to `Transcription.fromBytes(Uint8Array)` (Buffer extends Uint8Array, existing Node callers keep working)
- `SpeechToTextOptions.audio` narrowed from `Buffer | string` to `Uint8Array`
