# AI Engine

`@rudderjs/ai` is a multi-provider AI engine with agents, tools, streaming, middleware, structured output, and conversation memory.

## Installation

```bash
pnpm add @rudderjs/ai
```

Install the provider SDK(s) you need:

```bash
pnpm add @anthropic-ai/sdk   # Anthropic (Claude)
pnpm add openai               # OpenAI, DeepSeek, xAI, Groq, Mistral, Azure, Ollama
pnpm add @google/genai        # Google (Gemini)
```

## Setup

```ts
// config/ai.ts
import { Env } from '@rudderjs/support'

export default {
  default: Env.get('AI_MODEL', 'anthropic/claude-sonnet-4-5'),
  providers: {
    anthropic: { driver: 'anthropic', apiKey: Env.get('ANTHROPIC_API_KEY', '') },
    openai:    { driver: 'openai',    apiKey: Env.get('OPENAI_API_KEY', '') },
    google:    { driver: 'google',    apiKey: Env.get('GOOGLE_AI_API_KEY', '') },
    ollama:    { driver: 'ollama',    baseUrl: Env.get('OLLAMA_BASE_URL', 'http://localhost:11434') },
    groq:      { driver: 'groq',      apiKey: Env.get('GROQ_API_KEY', '') },
    deepseek:  { driver: 'deepseek',  apiKey: Env.get('DEEPSEEK_API_KEY', '') },
    xai:       { driver: 'xai',       apiKey: Env.get('XAI_API_KEY', '') },
    mistral:   { driver: 'mistral',   apiKey: Env.get('MISTRAL_API_KEY', '') },
  },
}
```

Register the provider:

```ts
// bootstrap/providers.ts
import { ai } from '@rudderjs/ai'
import configs from '../config/index.js'

export default [ai(configs.ai), ...]
```

## Providers

| Provider | SDK | Model String |
|---|---|---|
| Anthropic | `@anthropic-ai/sdk` | `anthropic/claude-sonnet-4-5` |
| OpenAI | `openai` | `openai/gpt-4o` |
| Google | `@google/genai` | `google/gemini-2.5-pro` |
| Ollama | `openai` | `ollama/llama3` |
| Groq | `openai` | `groq/llama-3.3-70b` |
| DeepSeek | `openai` | `deepseek/deepseek-chat` |
| xAI (Grok) | `openai` | `xai/grok-3` |
| Mistral | `openai` | `mistral/mistral-large-latest` |
| Azure OpenAI | `openai` | `azure/gpt-4o` |

Provider SDKs are optional dependencies — install only what you use. OpenAI-compatible providers (Groq, DeepSeek, xAI, Mistral, Azure, Ollama) all use the `openai` SDK. All adapters lazy-load their SDK on first use.

## Attachments

Send files and images with your prompts:

```ts
import { Document, Image } from '@rudderjs/ai'

const doc = await Document.fromPath('./report.pdf')
const img = await Image.fromUrl('https://example.com/chart.png')

const response = await agent.prompt('Summarize this report', {
  attachments: [doc.toAttachment(), img.toAttachment()],
})
```

| Method | Description |
|---|---|
| `Document.fromPath(path)` | Local file (auto-detects MIME) |
| `Document.fromUrl(url)` | Fetch from URL |
| `Document.fromString(text, name?)` | Raw text content |
| `Document.fromBase64(data, mime)` | Base64 string |
| `Image.fromPath(path)` | Local image file |
| `Image.fromUrl(url)` | Fetch image from URL |
| `Image.fromBase64(data, mime)` | Base64 image string |

## Conversations

Persist agent conversations across requests:

```ts
import { setConversationStore, MemoryConversationStore } from '@rudderjs/ai'

// Register a store (or pass in ai config)
setConversationStore(new MemoryConversationStore())

// Start a conversation
const response = await agent.forUser('user-123').prompt('What is TypeScript?')
// response.conversationId → 'abc-123'

// Continue the conversation (history auto-loaded)
const followUp = await agent.continue('abc-123').prompt('How does it compare to JS?')
```

Or configure via the `ai()` provider:

```ts
ai({
  default: 'anthropic/claude-sonnet-4-5',
  providers: { ... },
  conversations: new MemoryConversationStore(),
})
```

## Queue Integration

Run AI prompts in the background via `@rudderjs/queue`:

```ts
await agent.queue('Analyze this report')
  .onQueue('ai')
  .then(response => sendNotification(response.text))
  .catch(err => console.error(err))
  .send()
```

Requires `@rudderjs/queue` to be installed and a queue adapter registered.
