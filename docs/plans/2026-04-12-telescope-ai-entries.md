# Telescope AI Entries Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `ai` entry type to Telescope for monitoring agent/prompt executions, tool calls, token usage, and cost.

**Architecture:** The AI package (`@rudderjs/ai`) fires lifecycle events through a new `aiObservers` registry (same pattern as `httpObservers`, `gateObservers`). Telescope's `AiCollector` subscribes to this registry and records structured entries per agent execution. One `ai` entry per `prompt()`/`stream()` call — steps and tool calls are nested inside the entry content, not separate entries.

**Tech Stack:** TypeScript, `@rudderjs/ai` middleware system, Telescope vanilla HTML views (Alpine.js + Tailwind)

---

## Phase 1: AI Observer Registry in `@rudderjs/ai`

### Task 1: Create the AI Observer Registry

**Files:**
- Create: `packages/ai/src/observers.ts`

**Step 1: Create the observer registry**

Follow the exact pattern from `packages/http/src/observers.ts` — a process-wide singleton on globalThis that collectors subscribe to.

```typescript
// packages/ai/src/observers.ts

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

  /** @internal — used in tests */
  reset(): void { this.observers = [] }
}

if (!_g[_key]) {
  _g[_key] = new AiObserverRegistry()
}

export const aiObservers = _g[_key] as AiObserverRegistry
```

**Step 2: Export from package.json**

Add a new export path in `packages/ai/package.json` exports field:

```json
"./observers": {
  "import": "./dist/observers.js",
  "types": "./dist/observers.d.ts"
}
```

**Step 3: Build and verify**

```bash
cd packages/ai && pnpm build
```

---

### Task 2: Instrument the Agent Loop to Emit Observer Events

**Files:**
- Modify: `packages/ai/src/agent.ts` — `runAgentLoop()` and `runAgentLoopStreaming()`

**Step 1: Import the observer registry (lazy)**

At the top of `agent.ts`, add a lazy accessor (same pattern as `gate.ts` line 7):

```typescript
import type { AiObserverRegistry, AiObserverEvent, AiObserverStep, AiObserverToolCall } from './observers.js'

let _aiObs: AiObserverRegistry | null | undefined
function _getAiObservers(): AiObserverRegistry | null {
  if (_aiObs === undefined) {
    _aiObs = (globalThis as Record<string, unknown>)['__rudderjs_ai_observers__'] as AiObserverRegistry | undefined ?? null
  }
  return _aiObs
}
```

**Step 2: Add emission at the end of `runAgentLoop()`**

After the loop finishes (around line 627, after `onFinish` middleware), emit the observation:

```typescript
// After onFinish middleware, before returning response
const obs = _getAiObservers()
if (obs) {
  const observerSteps: AiObserverStep[] = response.steps.map((step, i) => ({
    iteration:    i + 1,
    model:        modelString,
    tokens:       step.usage,
    finishReason: step.finishReason,
    toolCalls:    step.toolCalls.map(tc => ({
      id:            tc.id,
      name:          tc.name,
      args:          tc.arguments,
      result:        step.toolResults.find(r => r.toolCallId === tc.id)?.result,
      duration:      0, // not tracked per-call yet
      needsApproval: false,
    })),
  }))

  obs.emit({
    kind:             'agent.completed',
    agentName:        agent.constructor.name,
    model:            modelString,
    provider:         providerName,
    input:            typeof input === 'string' ? input : JSON.stringify(input),
    output:           response.text,
    steps:            observerSteps,
    tokens:           response.usage,
    duration:         Math.round(performance.now() - loopStart),
    finishReason:     response.finishReason ?? 'stop',
    streaming:        false,
    conversationId:   response.conversationId ?? null,
    failoverAttempts: failoverCount,
  })
}
```

**Step 3: Add emission at the end of `runAgentLoopStreaming()`**

Same pattern, but `streaming: true`. The streaming loop collects the same data — emit after the generator completes.

**Step 4: Add emission on error**

In the catch block (around line 620), emit with `kind: 'agent.failed'`:

```typescript
const obs = _getAiObservers()
if (obs) {
  obs.emit({
    kind:             'agent.failed',
    agentName:        agent.constructor.name,
    model:            modelString,
    provider:         providerName,
    input:            typeof input === 'string' ? input : JSON.stringify(input),
    output:           '',
    steps:            collectedSteps,
    tokens:           accumulatedUsage,
    duration:         Math.round(performance.now() - loopStart),
    finishReason:     'error',
    streaming:        false,
    conversationId:   null,
    failoverAttempts: failoverCount,
    error:            error instanceof Error ? error.message : String(error),
  })
}
```

**Step 5: Build and verify**

```bash
cd packages/ai && pnpm build
```

---

## Phase 2: Telescope AiCollector

### Task 3: Add `ai` to EntryType and TelescopeConfig

**Files:**
- Modify: `packages/telescope/src/types.ts`

**Step 1: Extend the EntryType union**

Add `'ai'` to the `EntryType` union (around line 3):

```typescript
export type EntryType =
  | 'request' | 'query' | 'job' | 'exception' | 'log'
  | 'mail' | 'notification' | 'event' | 'cache' | 'schedule'
  | 'model' | 'command' | 'broadcast' | 'live'
  | 'http' | 'gate' | 'dump'
  | 'ai'
```

**Step 2: Add config flag**

Add `recordAi?: boolean` to `TelescopeConfig` (around line 130, next to other `record*` flags).

**Step 3: Add default**

In `defaultConfig` object, add:

```typescript
recordAi: true,
```

---

### Task 4: Create the AiCollector

**Files:**
- Create: `packages/telescope/src/collectors/ai.ts`

**Step 1: Write the collector**

```typescript
import type { Collector, TelescopeStorage } from '../types.js'
import { createEntry } from '../storage.js'
import { batchOpts } from '../batch-context.js'

interface AiEvent {
  kind:             string
  agentName:        string
  model:            string
  provider:         string
  input:            string
  output:           string
  steps:            AiStep[]
  tokens:           { prompt: number; completion: number; total: number }
  duration:         number
  finishReason:     string
  streaming:        boolean
  conversationId:   string | null
  failoverAttempts: number
  error?:           string
}

interface AiStep {
  iteration:    number
  model:        string
  tokens:       { prompt: number; completion: number; total: number }
  finishReason: string
  toolCalls:    AiToolCall[]
}

interface AiToolCall {
  id:            string
  name:          string
  args:          unknown
  result:        unknown
  duration:      number
  needsApproval: boolean
}

/**
 * Records AI agent executions by subscribing to the `aiObservers`
 * registry exported from `@rudderjs/ai/observers`.
 *
 * Each `prompt()` or `stream()` call becomes one `ai` entry with
 * steps and tool calls nested inside.
 */
export class AiCollector implements Collector {
  readonly name = 'AI Collector'
  readonly type = 'ai' as const

  constructor(private readonly storage: TelescopeStorage) {}

  async register(): Promise<void> {
    try {
      const { aiObservers } = await import('@rudderjs/ai/observers') as {
        aiObservers: { subscribe: (fn: (e: AiEvent) => void) => void }
      }
      aiObservers.subscribe((event) => this.record(event))
    } catch {
      // @rudderjs/ai not installed — skip
    }
  }

  private record(event: AiEvent): void {
    const tags: string[] = [
      `model:${event.model}`,
      `provider:${event.provider}`,
      `agent:${event.agentName}`,
    ]

    if (event.kind === 'agent.failed') tags.push('error')
    if (event.duration > 5000) tags.push('slow')
    if (event.steps.some(s => s.toolCalls.length > 0)) tags.push('has_tools')
    if (event.streaming) tags.push('streaming')

    const toolCalls = event.steps.flatMap(s => s.toolCalls)

    this.storage.store(createEntry('ai', {
      kind:             event.kind,
      agentName:        event.agentName,
      model:            event.model,
      provider:         event.provider,
      input:            event.input,
      output:           event.output,
      steps:            event.steps,
      tokens:           event.tokens,
      duration:         event.duration,
      finishReason:     event.finishReason,
      streaming:        event.streaming,
      conversationId:   event.conversationId,
      failoverAttempts: event.failoverAttempts,
      toolCallCount:    toolCalls.length,
      toolCalls,
      error:            event.error,
    }, { tags, ...batchOpts() }))
  }
}
```

---

### Task 5: Register AiCollector in TelescopeProvider

**Files:**
- Modify: `packages/telescope/src/index.ts`

**Step 1: Import the collector**

Add to imports (around line 15, with other collector imports):

```typescript
import { AiCollector } from './collectors/ai.js'
```

**Step 2: Register conditionally**

In the `boot()` method, after the other collector registrations (around line 189):

```typescript
if (resolved.recordAi) collectors.push(new AiCollector(storage))
```

---

## Phase 3: Telescope UI

### Task 6: Add AI to Sidebar Navigation

**Files:**
- Modify: `packages/telescope/src/views/vanilla/Layout.ts`

**Step 1: Add nav item**

In the `nav` array (around line 48, before 'Live (Yjs)'), add:

```typescript
{ label: 'AI',            path: '/ai',           icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
```

(Lightbulb/sparkle icon — appropriate for AI)

---

### Task 7: Add AI List Columns

**Files:**
- Modify: `packages/telescope/src/views/vanilla/columns.ts`

**Step 1: Add the AI page config**

In the `pages` object, add a new entry:

```typescript
ai: {
  type: 'ai' as EntryType,
  title: 'AI',
  columns: [
    { label: 'Agent',    key: "entry.content.agentName" },
    { label: 'Model',    key: "entry.content.model",          badge: true },
    { label: 'Tokens',   key: "entry.content.tokens?.total ?? '—'" },
    { label: 'Tools',    key: "entry.content.toolCallCount || '—'" },
    { label: 'Duration', key: "entry.content.duration + 'ms'" },
  ],
},
```

---

### Task 8: Add AI Detail View

**Files:**
- Modify: `packages/telescope/src/views/vanilla/details/views.ts`

**Step 1: Create the AiView function**

Add before the `detailViews` export object:

```typescript
const AiView: ViewFn = (entry) => {
  const c = entry.content as Record<string, unknown>
  const tokens    = c['tokens']    as { prompt: number; completion: number; total: number } | undefined
  const steps     = c['steps']     as Array<Record<string, unknown>> | undefined
  const toolCalls = c['toolCalls'] as Array<Record<string, unknown>> | undefined

  // Status badge — green for completed, red for failed
  const kind = c['kind'] as string
  const kindBadge = kind === 'agent.completed'
    ? raw('<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Completed</span>')
    : raw('<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Failed</span>')

  // Build details table
  const details: Record<string, unknown> = {
    Status:           kindBadge,
    Agent:            c['agentName'],
    Model:            Badge(c['model'] as string),
    Provider:         c['provider'],
    Duration:         c['duration'] != null ? `${c['duration']}ms` : '—',
    'Finish Reason':  Badge(c['finishReason'] as string),
    Steps:            steps?.length ?? 0,
    'Tool Calls':     c['toolCallCount'] ?? 0,
    Streaming:        c['streaming'] ? 'Yes' : 'No',
  }
  if (c['conversationId']) details['Conversation ID'] = c['conversationId']
  if (c['failoverAttempts'] && (c['failoverAttempts'] as number) > 0) {
    details['Failover Attempts'] = c['failoverAttempts']
  }

  // Token breakdown
  const tokenDetails = tokens ? {
    'Prompt Tokens':     tokens.prompt,
    'Completion Tokens': tokens.completion,
    'Total Tokens':      tokens.total,
  } : null

  return html`
    ${Card('AI Request', KeyValueTable(details))}

    ${tokenDetails ? Card('Token Usage', KeyValueTable(tokenDetails)) : ''}

    ${c['input'] ? Card('Input', CodeBlock(String(c['input']), { maxHeight: '200px' })) : ''}
    ${c['output'] ? Card('Output', CodeBlock(String(c['output']), { maxHeight: '400px' })) : ''}
    ${c['error'] ? Card('Error', raw(`<pre class="text-sm text-red-600 whitespace-pre-wrap">${escape(String(c['error']))}</pre>`)) : ''}

    ${toolCalls && toolCalls.length > 0 ? Card(`Tool Calls (${toolCalls.length})`, renderToolCalls(toolCalls)) : ''}
    ${steps && steps.length > 1 ? Card(`Steps (${steps.length})`, renderSteps(steps)) : ''}
  `
}

function renderToolCalls(toolCalls: Array<Record<string, unknown>>): SafeString {
  const rows = toolCalls.map(tc => html`
    <div class="border-b border-gray-100 py-3 last:border-0">
      <div class="flex items-center gap-2 mb-1">
        ${Badge(String(tc['name'] ?? ''))}
        ${tc['duration'] ? raw(`<span class="text-xs text-gray-400">${tc['duration']}ms</span>`) : ''}
        ${tc['needsApproval'] ? raw('<span class="text-xs text-amber-500">requires approval</span>') : ''}
      </div>
      <details class="text-xs">
        <summary class="cursor-pointer text-gray-500 hover:text-gray-700">Arguments & Result</summary>
        <div class="mt-2 space-y-2">
          ${tc['args'] !== undefined ? html`<div><span class="text-gray-500">Args:</span> ${JsonBlock(tc['args'])}</div>` : ''}
          ${tc['result'] !== undefined ? html`<div><span class="text-gray-500">Result:</span> ${JsonBlock(tc['result'])}</div>` : ''}
        </div>
      </details>
    </div>
  `).join('')
  return raw(rows)
}

function renderSteps(steps: Array<Record<string, unknown>>): SafeString {
  const rows = steps.map(step => {
    const tc = step['toolCalls'] as Array<Record<string, unknown>> | undefined
    const tokens = step['tokens'] as { total: number } | undefined
    return html`
      <div class="border-b border-gray-100 py-2 last:border-0 text-sm">
        <div class="flex items-center justify-between">
          <span class="font-medium">Step ${step['iteration']}</span>
          <div class="flex items-center gap-3 text-xs text-gray-500">
            ${tokens ? raw(`<span>${tokens.total} tokens</span>`) : ''}
            ${tc && tc.length > 0 ? raw(`<span>${tc.length} tool call${tc.length > 1 ? 's' : ''}</span>`) : ''}
            ${Badge(String(step['finishReason'] ?? ''))}
          </div>
        </div>
      </div>
    `
  }).join('')
  return raw(rows)
}
```

**Step 2: Register in detailViews**

Add to the `detailViews` export:

```typescript
ai: AiView,
```

---

### Task 9: Add API Route Mapping

**Files:**
- Modify: `packages/telescope/src/routes.ts`

**Step 1: Check the apiPath mapping**

The existing mapping at line 125:
```typescript
const apiPath = type === 'query' ? 'queries' : type === 'http' ? 'http' : `${type}s`
```

For `ai`, this produces `ais` — acceptable. Alternatively, extend the mapping:
```typescript
const apiPath = type === 'query' ? 'queries' : type === 'http' ? 'http' : type === 'ai' ? 'ai' : `${type}s`
```

This keeps the API path as `/telescope/api/ai` (not `/telescope/api/ais`).

---

## Phase 4: Playground Integration

### Task 10: Add AI Test Route

**Files:**
- Modify: `playground/routes/web.ts`

**Step 1: Add a test route**

```typescript
// GET /test/ai — fires an AI agent execution for telescope testing
Route.get('/test/ai', async (_req, res) => {
  const { agent, toolDefinition } = await import('@rudderjs/ai')
  const { z } = await import('zod')

  const calculator = toolDefinition({
    name: 'calculator',
    description: 'Performs basic math',
    inputSchema: z.object({
      expression: z.string().describe('Math expression to evaluate'),
    }),
  }).server(({ expression }) => {
    return { result: eval(expression) }
  })

  const mathAgent = agent({
    instructions: 'You are a helpful math assistant. Use the calculator tool.',
    model: 'anthropic/claude-haiku',
    tools: [calculator],
  })

  const response = await mathAgent.prompt('What is 2 + 2?')
  res.json({
    text:   response.text,
    steps:  response.steps.length,
    tokens: response.usage,
  })
})
```

---

### Task 11: Add Telescope Config for AI

**Files:**
- Modify: `playground/config/telescope.ts`

**Step 1: Ensure recordAi is enabled**

Add to the telescope config if not already present:

```typescript
recordAi: true,
```

---

## Phase 5: Build, Test, and Docs

### Task 12: Build All and Verify

**Step 1: Build affected packages**

```bash
cd packages/ai && pnpm build
cd packages/telescope && npx tsc -p tsconfig.build.json --incremental false
cd packages/server-hono && pnpm build  # if modified
```

**Step 2: Start playground and test**

```bash
cd playground && pnpm dev
```

1. Hit `http://localhost:3000/test/ai` — verify JSON response
2. Open `http://localhost:3000/telescope/ai` — verify list view shows the entry
3. Click the entry — verify detail view shows agent name, model, tokens, tool calls, steps
4. Hit `/test/ai` again and check the request detail — verify the AI entry shows as a related entry via batchId

### Task 13: Update Docs

**Files:**
- Modify: `CLAUDE.md` — add note about AI entries in telescope
- Modify: `Architecture.md` — mention AI monitoring in the telescope section

---

## Summary

| Phase | Tasks | Files Changed |
|-------|-------|--------------|
| 1. AI Observers | 1-2 | `packages/ai/src/observers.ts` (new), `packages/ai/src/agent.ts`, `packages/ai/package.json` |
| 2. AiCollector | 3-5 | `packages/telescope/src/types.ts`, `packages/telescope/src/collectors/ai.ts` (new), `packages/telescope/src/index.ts` |
| 3. UI | 6-9 | `Layout.ts`, `columns.ts`, `views.ts`, `routes.ts` |
| 4. Playground | 10-11 | `playground/routes/web.ts`, `playground/config/telescope.ts` |
| 5. Verify | 12-13 | Build + test + docs |
