---
"@rudderjs/mcp": minor
---

Close the three remaining `@rudderjs/mcp` gaps:

- **Expanded Zod-to-JSON-Schema coverage** — nested `object`, `union`,
  `literal`, `nullable`, `date`, `record`, and `tuple` now convert to proper
  JSON Schema instead of silently falling through to `{ type: "string" }`.
  Both Zod v3 and v4 internal representations are supported.

- **Streaming tool responses (progress notifications)** — tool `handle()`
  may now be an `async function*` that yields `McpToolProgress`
  (`{ progress, total?, message? }`) updates and returns the final
  `McpToolResult`. The runtime forwards yields as `notifications/progress`
  when the caller supplied a `progressToken`, and drops them silently
  otherwise. Mirrors the `@rudderjs/ai` streaming-tool shape — no `send`
  callback parameter.

- **Server-initiated notifications** — `McpServer` instances now expose
  `notifyResourceUpdated(uri)`, `notifyResourceListChanged()`,
  `notifyToolListChanged()`, `notifyPromptListChanged()`, and a
  `notify(method, params?)` escape hatch. The runtime attaches each active
  SDK session to its parent `McpServer` so a single notify call fans out to
  every connected client. HTTP transport detaches on session close.

`McpTestClient.callTool(name, input, onProgress?)` accepts an optional
progress collector for testing streaming tools without spinning up a
transport.
