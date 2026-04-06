# Middleware

AI middleware lets you intercept and modify agent behavior — logging, rate limiting, caching, or custom logic.

## Defining Middleware

```ts
import type { AiMiddleware } from '@rudderjs/ai'

const loggingMiddleware: AiMiddleware = {
  name: 'logger',
  onStart(ctx) {
    console.log(`[AI] Request ${ctx.requestId} started`)
  },
  onFinish(ctx) {
    console.log(`[AI] Request ${ctx.requestId} — ${ctx.usage.totalTokens} tokens`)
  },
  onBeforeToolCall(ctx, toolName, args) {
    console.log(`[AI] Calling tool: ${toolName}`, args)
  },
  onAfterToolCall(ctx, toolName, result) {
    console.log(`[AI] Tool ${toolName} returned:`, result)
  },
}
```

## Using Middleware

### On an Agent Class

```ts
import { Agent } from '@rudderjs/ai'
import type { HasMiddleware } from '@rudderjs/ai'

class MyAgent extends Agent implements HasMiddleware {
  instructions() { return '...' }
  middleware() { return [loggingMiddleware] }
}
```

### On an Anonymous Agent

```ts
import { agent } from '@rudderjs/ai'

const a = agent({
  instructions: '...',
  middleware: [loggingMiddleware],
})
```

## Middleware Hooks

All hooks are wired into both the non-streaming and streaming agent loops.

| Hook | Execution | Description |
|---|---|---|
| `onConfig(ctx, config, phase)` | Piped (each transforms) | Modify request config at `init` or `beforeModel` phase |
| `onStart(ctx)` | Sequential | Agent run begins |
| `onIteration(ctx)` | Sequential | Each LLM call starts |
| `onChunk(ctx, chunk)` | Piped (can drop) | Transform or filter streaming chunks (streaming only) |
| `onBeforeToolCall(ctx, name, args)` | First wins | Skip, abort, or transform tool args |
| `onAfterToolCall(ctx, name, args, result)` | Sequential | After a tool returns |
| `onToolPhaseComplete(ctx)` | Sequential | After all tools in a step |
| `onUsage(ctx, usage)` | Sequential | Token usage after each provider response |
| `onFinish(ctx)` | Sequential | Agent run completes |
| `onAbort(ctx, reason)` | Sequential | When `ctx.abort()` is called |
| `onError(ctx, error)` | Sequential | On exceptions |

### `onBeforeToolCall` Return Values

| Return | Effect |
|---|---|
| `void` / `undefined` | Continue normally |
| `{ type: 'transformArgs', args }` | Replace tool arguments |
| `{ type: 'skip', result }` | Skip execution, use provided result |
| `{ type: 'abort', reason }` | Stop the agent loop |

## Testing

```ts
import { AiFake } from '@rudderjs/ai'

const fake = AiFake.fake()
fake.respondWith('Mocked response')

const response = await AI.prompt('Hello')
assert.strictEqual(response.text, 'Mocked response')

fake.assertPrompted(input => input.includes('Hello'))
fake.restore()
```
