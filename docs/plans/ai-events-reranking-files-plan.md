# AI Observer Registry, Reranking & File Uploads Plan

Add an observer registry for AI monitoring (consumed by Telescope), reranking support, and provider file management to `@rudderjs/ai`, closing the remaining feature gaps vs Laravel AI SDK.

**Status:** Not started

**Packages affected:** `@rudderjs/ai`

**Breaking change risk:** None. All changes are additive. No existing types, exports, or function signatures change. The types consumed by `@pilotiq-pro/ai` (`AiMessage`, `AgentResponse`, `StreamChunk`, `ToolCall`, `AnyTool`, `ConversationStore`, `ConversationStoreMeta`, `toolDefinition`) are untouched.

**Consumer impact:**
- `@pilotiq-pro/ai` — imports only types + `toolDefinition`. Zero impact.
- `rudderjs/playground` — can demo new features but nothing breaks.
- `pilotiq`, `pilotiq-pro` playgrounds — linked via pnpm.overrides, purely additive.

**Depends on:** Nothing — independent of MCP plan and boost plan.

**Related plan:** `2026-04-12-telescope-ai-entries.md` — consumes the observer registry from Phase 1 to build the Telescope AI collector and UI.

---

## Goal

After this plan:

1. The agent loop emits structured observations via an **`aiObservers` registry** (globalThis singleton, same pattern as `httpObservers`). Telescope's `AiCollector` subscribes to this to record AI entries. Any other consumer (billing, logging, alerting) can also subscribe — no per-agent middleware required.
2. `AI.rerank(query, documents, options?)` provides reranking via Cohere and Jina providers, with the same fluent builder pattern as embeddings.
3. `AI.files()` provides provider-managed file upload/list/delete for OpenAI, Anthropic, and Gemini — needed for large document context windows and assistant APIs.

---

## Non-Goals

- **`@rudderjs/core` event classes.** We considered `AgentPrompted` / `ToolCalled` / `AgentResponseGenerated` dispatched via the framework's event system, but the observer registry pattern is better: it's decoupled from `@rudderjs/core`, works standalone, and matches how every other Telescope collector works (`httpObservers`, `gateObservers`).
- **Vector stores.** Provider-managed vector stores (OpenAI only) are low priority and can be added later on top of the files API.
- **Partial JSON streaming.** TanStack-style incremental structured output parsing is a provider-level concern — out of scope.
- **Realtime voice.** OpenAI realtime API is a separate transport layer — out of scope.
- **Changing middleware hooks.** Middleware and observers are complementary. Middleware transforms/intercepts per-agent; observers notify globally.

---

## Phase 1 — AI Observer Registry

**What:** A process-wide observer registry that the agent loop emits to after every `prompt()` / `stream()` call. One event per execution with full structured data (agent, model, tokens, steps, tool calls, duration).

**Why observers, not `@rudderjs/core` events:**
- Follows the exact pattern of `httpObservers` (used by Telescope's `HttpCollector`) and `gateObservers` — consistent architecture
- `@rudderjs/ai` doesn't need to import `@rudderjs/core` — works standalone
- Observers live on `globalThis` — zero framework coupling
- Any consumer calls `aiObservers.subscribe(fn)` — Telescope, billing, logging all work the same way

**Files to create/modify:**

1. **`packages/ai/src/observers.ts`** (new) — Observer registry:
   ```ts
   const _g = globalThis as Record<string, unknown>
   const _key = '__rudderjs_ai_observers__'

   export interface AiObserverEvent {
     kind: 'agent.completed' | 'agent.failed'
     agentName:      string
     model:          string
     provider:       string
     input:          string
     output:         string
     steps:          AiObserverStep[]
     tokens:         { prompt: number; completion: number; total: number }
     duration:       number
     finishReason:   string
     streaming:      boolean
     conversationId: string | null
     failoverAttempts: number
     error?:         string
   }

   export interface AiObserverStep {
     iteration:    number
     model:        string
     tokens:       { prompt: number; completion: number; total: number }
     finishReason: string
     toolCalls:    AiObserverToolCall[]
   }

   export interface AiObserverToolCall {
     id:       string
     name:     string
     args:     unknown
     result:   unknown
     duration: number
     needsApproval: boolean
   }

   export class AiObserverRegistry {
     private observers: Array<(event: AiObserverEvent) => void> = []

     subscribe(fn: (event: AiObserverEvent) => void): void {
       this.observers.push(fn)
     }

     emit(event: AiObserverEvent): void {
       for (const fn of this.observers) {
         try { fn(event) } catch { /* don't let observer errors break the agent */ }
       }
     }

     reset(): void { this.observers = [] }
   }

   if (!_g[_key]) {
     _g[_key] = new AiObserverRegistry()
   }

   export const aiObservers = _g[_key] as AiObserverRegistry
   ```

2. **`packages/ai/package.json`** (modify) — Add export path:
   ```json
   "./observers": {
     "import": "./dist/observers.js",
     "types": "./dist/observers.d.ts"
   }
   ```

3. **`packages/ai/src/agent.ts`** (modify) — In both `runAgentLoop()` and `runAgentLoopStreaming()`:
   - Record `loopStart = performance.now()` at entry
   - On success: emit `kind: 'agent.completed'` with full step/tool/token data
   - On error: emit `kind: 'agent.failed'` with accumulated data + error message
   - Use lazy accessor pattern (same as gate observers):
     ```ts
     let _aiObs: AiObserverRegistry | null | undefined
     function _getAiObservers(): AiObserverRegistry | null {
       if (_aiObs === undefined) {
         _aiObs = (globalThis as Record<string, unknown>)['__rudderjs_ai_observers__'] as AiObserverRegistry | undefined ?? null
       }
       return _aiObs
     }
     ```

4. **`packages/ai/src/index.ts`** (modify) — Re-export observer types (not the registry itself — consumers import from `@rudderjs/ai/observers`).

**Test:**
- Unit test: subscribe to `aiObservers`, prompt an agent, assert event emitted with correct shape
- Verify standalone usage (no framework) doesn't error

---

## Phase 2 — Reranking

**What:** `AI.rerank()` with Cohere and Jina provider adapters.

**Files to create/modify:**

1. **`packages/ai/src/types.ts`** (modify) — Add types:
   ```ts
   export interface RerankAdapter {
     rerank(query: string, documents: string[], options?: RerankOptions): Promise<RerankResult>
   }

   export interface RerankOptions {
     model?: string
     topN?: number
   }

   export interface RerankResult {
     results: RerankResultItem[]
   }

   export interface RerankResultItem {
     index: number
     relevance: number
     document: string
   }
   ```

2. **`packages/ai/src/rerank.ts`** (new) — Fluent builder:
   ```ts
   export class Reranker {
     static of(query: string) { return new Reranker(query) }
     documents(docs: string[]) { ... }
     model(model: string) { ... }
     topN(n: number) { ... }
     async rank(): Promise<RerankResult> { ... }
   }
   ```

3. **`packages/ai/src/providers/cohere.ts`** (new) — Cohere provider:
   - Optional dep: `cohere-ai@>=7.0.0`
   - Implements `RerankAdapter` via `client.rerank()`

4. **`packages/ai/src/providers/jina.ts`** (new) — Jina provider:
   - Direct HTTP (Jina's API is simple REST — no heavy SDK needed)
   - POST to `https://api.jina.ai/v1/rerank`
   - Implements `RerankAdapter`

5. **`packages/ai/src/registry.ts`** (modify) — Add `resolveReranker(provider: string): RerankAdapter` method. Add `createRerank?()` to `ProviderFactory` interface.

6. **`packages/ai/src/facade.ts`** (modify) — Add:
   ```ts
   static rerank(query: string, documents: string[], options?: RerankOptions): Promise<RerankResult>
   ```

7. **`packages/ai/src/fake.ts`** (modify) — Add `respondWithRerank()` and `assertReranked()`.

8. **`packages/ai/package.json`** (modify) — Add `cohere-ai` to `peerDependencies` + `peerDependenciesMeta` (optional).

**Test:** Mock Cohere/Jina responses, verify ranking returns sorted results.

---

## Phase 3 — Provider File Management

**What:** `AI.files()` for uploading, listing, and deleting files on provider platforms.

**Files to create/modify:**

1. **`packages/ai/src/types.ts`** (modify) — Add types:
   ```ts
   export interface FileAdapter {
     upload(filePath: string, purpose?: string): Promise<FileUploadResult>
     list(): Promise<FileListResult>
     delete(fileId: string): Promise<void>
     retrieve?(fileId: string): Promise<FileContent>
   }

   export interface FileUploadResult {
     id: string
     filename: string
     bytes: number
     purpose?: string
   }

   export interface FileListResult {
     files: FileUploadResult[]
   }

   export interface FileContent {
     data: Buffer
     mimeType: string
   }
   ```

2. **`packages/ai/src/files.ts`** (new) — File manager:
   ```ts
   export class FileManager {
     upload(path: string, options?: { purpose?: string }) { ... }
     list() { ... }
     delete(fileId: string) { ... }
     retrieve(fileId: string) { ... }
   }
   ```

3. **Provider adapters** (modify existing files — add `FileAdapter` implementation):
   - **`providers/openai.ts`** — `client.files.create()`, `.list()`, `.del()`, `.content()`
   - **`providers/anthropic.ts`** — Anthropic Files API (beta)
   - **`providers/google.ts`** — Gemini File API (`client.files.upload()`, `.list()`, `.delete()`)

4. **`packages/ai/src/registry.ts`** (modify) — Add `resolveFileAdapter(provider: string): FileAdapter`. Add `createFiles?()` to `ProviderFactory` interface.

5. **`packages/ai/src/facade.ts`** (modify) — Add:
   ```ts
   static files(provider?: string): FileManager
   ```

6. **`packages/ai/src/fake.ts`** (modify) — Add `respondWithFileUpload()` and `assertFileUploaded()`.

**Test:** Mock provider file APIs, verify upload/list/delete round-trip.

---

## Phase Order

| Phase | Description | Depends on |
|---|---|---|
| 1 | AI observer registry | — |
| 2 | Reranking | — (parallel with 1) |
| 3 | Provider file management | — (parallel with 1-2) |

All three phases are independent and can be done in any order. Phase 1 should be done before the Telescope AI entries plan (`2026-04-12-telescope-ai-entries.md`) since that plan consumes the observer registry.

---

## Verification Checklist

- [ ] Existing `@rudderjs/ai` test suite passes (no regression)
- [ ] `@pilotiq-pro/ai` types still compile (`pnpm typecheck` from pilotiq-pro root)
- [ ] Observer emits on both `runAgentLoop()` and `runAgentLoopStreaming()`
- [ ] Observer is no-op when no subscribers (standalone usage)
- [ ] Observer errors don't break the agent loop (try/catch in emit)
- [ ] `AI.rerank()` works with Cohere and Jina
- [ ] `AI.files()` upload/list/delete works with OpenAI, Anthropic, Gemini
- [ ] `AiFake` covers all new features
- [ ] All new exports are in `index.ts`
- [ ] `pnpm typecheck` clean across monorepo
