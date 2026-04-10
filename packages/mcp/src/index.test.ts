import 'reflect-metadata'
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import {
  Mcp, McpServer, McpTool, McpResource, McpPrompt, McpResponse,
  Name, Version, Instructions, Description,
  McpTestClient,
} from './index.js'
import { toKebabCase } from './utils.js'
import { zodToJsonSchema } from './zod-to-json-schema.js'

// ─── toKebabCase ──────────────────────────────────────────

describe('toKebabCase', () => {
  it('converts PascalCase to kebab-case', () => {
    assert.equal(toKebabCase('MyToolName'), 'my-tool-name')
  })

  it('converts camelCase to kebab-case', () => {
    assert.equal(toKebabCase('searchUsers'), 'search-users')
  })

  it('converts spaces and underscores', () => {
    assert.equal(toKebabCase('hello_world test'), 'hello-world-test')
  })

  it('handles single word', () => {
    assert.equal(toKebabCase('Hello'), 'hello')
  })
})

// ─── zodToJsonSchema ──────────────────────────────────────

describe('zodToJsonSchema', () => {
  it('converts string fields', () => {
    const schema = z.object({ name: z.string() })
    const result = zodToJsonSchema(schema)

    assert.deepStrictEqual(result, {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })
  })

  it('converts number fields', () => {
    const schema = z.object({ count: z.number() })
    const result = zodToJsonSchema(schema)

    assert.deepStrictEqual(result.properties, { count: { type: 'number' } })
    assert.deepStrictEqual(result.required, ['count'])
  })

  it('converts boolean fields', () => {
    const schema = z.object({ active: z.boolean() })
    const result = zodToJsonSchema(schema)

    assert.deepStrictEqual(result.properties, { active: { type: 'boolean' } })
  })

  it('handles optional fields (not in required)', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = zodToJsonSchema(schema)

    assert.deepStrictEqual(result.required, ['name'])
    assert.ok('bio' in (result.properties as Record<string, unknown>))
  })

  it('handles default fields (not in required)', () => {
    const schema = z.object({ limit: z.number().default(10) })
    const result = zodToJsonSchema(schema)

    assert.ok(!('required' in result) || (result.required as string[]).length === 0)
  })

  it('handles enum fields', () => {
    const schema = z.object({ role: z.enum(['admin', 'user']) })
    const result = zodToJsonSchema(schema)

    const prop = (result.properties as Record<string, Record<string, unknown>>)['role']
    assert.equal(prop!['type'], 'string')
    assert.deepStrictEqual(prop!['enum'], ['admin', 'user'])
  })

  it('handles array fields', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const result = zodToJsonSchema(schema)

    const prop = (result.properties as Record<string, Record<string, unknown>>)['tags']
    assert.equal(prop!['type'], 'array')
    assert.deepStrictEqual(prop!['items'], { type: 'string' })
  })

  it('handles description on fields', () => {
    const schema = z.object({ query: z.string().describe('Search query') })
    const result = zodToJsonSchema(schema)

    const prop = (result.properties as Record<string, Record<string, unknown>>)['query']
    assert.equal(prop!['description'], 'Search query')
  })
})

// ─── McpResponse ──────────────────────────────────────────

describe('McpResponse', () => {
  it('text() returns text content', () => {
    const result = McpResponse.text('hello')
    assert.deepStrictEqual(result, {
      content: [{ type: 'text', text: 'hello' }],
    })
  })

  it('json() returns formatted JSON', () => {
    const result = McpResponse.json({ key: 'value' })
    assert.equal(result.content[0]!.type, 'text')
    assert.ok((result.content[0] as { text: string }).text.includes('"key"'))
  })

  it('error() returns error content', () => {
    const result = McpResponse.error('something broke')
    assert.equal(result.isError, true)
    assert.ok((result.content[0] as { text: string }).text.includes('Error:'))
  })
})

// ─── Decorators ───────────────────────────────────────────

describe('Decorators', () => {
  it('@Name sets server name', () => {
    @Name('my-server')
    @Version('2.0.0')
    class TestServer extends McpServer {}

    const server = new TestServer()
    const meta = server.metadata()
    assert.equal(meta.name, 'my-server')
    assert.equal(meta.version, '2.0.0')
  })

  it('@Instructions sets server instructions', () => {
    @Instructions('Be helpful')
    class TestServer extends McpServer {}

    const server = new TestServer()
    const meta = server.metadata()
    assert.equal(meta.instructions, 'Be helpful')
  })

  it('defaults to class name and 1.0.0 without decorators', () => {
    class PlainServer extends McpServer {}

    const server = new PlainServer()
    const meta = server.metadata()
    assert.equal(meta.name, 'PlainServer')
    assert.equal(meta.version, '1.0.0')
  })

  it('@Description sets tool/prompt/resource description', () => {
    @Description('Does something useful')
    class TestTool extends McpTool {
      schema() { return z.object({}) }
      async handle() { return McpResponse.text('done') }
    }

    const tool = new TestTool()
    assert.equal(tool.description(), 'Does something useful')
  })
})

// ─── McpTool ──────────────────────────────────────────────

describe('McpTool', () => {
  it('derives name from class name in kebab-case, removing Tool suffix', () => {
    class SearchUsersTool extends McpTool {
      schema() { return z.object({ query: z.string() }) }
      async handle() { return McpResponse.text('found') }
    }

    const tool = new SearchUsersTool()
    assert.equal(tool.name(), 'search-users')
  })

  it('description() returns empty string without @Description', () => {
    class PlainTool extends McpTool {
      schema() { return z.object({}) }
      async handle() { return McpResponse.text('ok') }
    }

    assert.equal(new PlainTool().description(), '')
  })
})

// ─── McpPrompt ────────────────────────────────────────────

describe('McpPrompt', () => {
  it('derives name from class name, removing Prompt suffix', () => {
    class CodeReviewPrompt extends McpPrompt {
      async handle() { return [{ role: 'user' as const, content: 'Review this' }] }
    }

    assert.equal(new CodeReviewPrompt().name(), 'code-review')
  })
})

// ─── McpResource ──────────────────────────────────────────

describe('McpResource', () => {
  it('defaults mimeType to text/plain', () => {
    class TestResource extends McpResource {
      uri() { return 'file:///test.txt' }
      async handle() { return 'content' }
    }

    assert.equal(new TestResource().mimeType(), 'text/plain')
  })
})

// ─── Mcp Registry ─────────────────────────────────────────

describe('Mcp', () => {
  beforeEach(() => {
    // Clear registries between tests
    Mcp.getWebServers().clear()
    Mcp.getLocalServers().clear()
  })

  it('registers and retrieves web servers', () => {
    class TestServer extends McpServer {}
    Mcp.web('/mcp', TestServer)

    const servers = Mcp.getWebServers()
    assert.equal(servers.size, 1)
    assert.ok(servers.has('/mcp'))
  })

  it('registers and retrieves local servers', () => {
    class TestServer extends McpServer {}
    Mcp.local('test', TestServer)

    const servers = Mcp.getLocalServers()
    assert.equal(servers.size, 1)
    assert.ok(servers.has('test'))
  })

  it('web servers include middleware', () => {
    class TestServer extends McpServer {}
    const middleware = [() => {}]
    Mcp.web('/mcp', TestServer, middleware)

    const entry = Mcp.getWebServers().get('/mcp')
    assert.ok(entry)
    assert.equal(entry.middleware.length, 1)
  })
})

// ─── McpTestClient ────────────────────────────────────────

describe('McpTestClient', () => {
  class EchoTool extends McpTool {
    schema() { return z.object({ message: z.string() }) }
    async handle(input: Record<string, unknown>) {
      return McpResponse.text(String(input['message']))
    }
  }

  class InfoResource extends McpResource {
    uri() { return 'info://version' }
    async handle() { return '1.0.0' }
  }

  class GreetPrompt extends McpPrompt {
    async handle(args: Record<string, unknown>) {
      return [{ role: 'user' as const, content: `Hello ${String(args['name'])}` }]
    }
  }

  class TestServer extends McpServer {
    protected tools = [EchoTool]
    protected resources = [InfoResource]
    protected prompts = [GreetPrompt]
  }

  it('lists tools', async () => {
    const client = new McpTestClient(TestServer)
    const tools = await client.listTools()
    assert.equal(tools.length, 1)
    assert.equal(tools[0]!.name, 'echo')
  })

  it('calls a tool', async () => {
    const client = new McpTestClient(TestServer)
    const result = await client.callTool('echo', { message: 'hi' })
    assert.equal(result.content[0]!.type, 'text')
    assert.equal((result.content[0] as { text: string }).text, 'hi')
  })

  it('throws on unknown tool', async () => {
    const client = new McpTestClient(TestServer)
    await assert.rejects(
      () => client.callTool('nonexistent'),
      { message: /not found/ },
    )
  })

  it('lists and reads resources', async () => {
    const client = new McpTestClient(TestServer)
    const resources = await client.listResources()
    assert.equal(resources.length, 1)
    assert.equal(resources[0]!.uri, 'info://version')

    const content = await client.readResource('info://version')
    assert.equal(content, '1.0.0')
  })

  it('throws on unknown resource', async () => {
    const client = new McpTestClient(TestServer)
    await assert.rejects(
      () => client.readResource('info://unknown'),
      { message: /not found/ },
    )
  })

  it('lists and gets prompts', async () => {
    const client = new McpTestClient(TestServer)
    const prompts = await client.listPrompts()
    assert.equal(prompts.length, 1)
    assert.equal(prompts[0]!.name, 'greet')

    const messages = await client.getPrompt('greet', { name: 'World' })
    assert.equal(messages.length, 1)
    assert.equal(messages[0]!.content, 'Hello World')
  })

  it('assertion helpers work', () => {
    const client = new McpTestClient(TestServer)
    client.assertToolExists('echo')
    client.assertToolCount(1)
    client.assertResourceExists('info://version')
    client.assertResourceCount(1)
    client.assertPromptExists('greet')
    client.assertPromptCount(1)
  })

  it('assertion helpers throw on mismatch', () => {
    const client = new McpTestClient(TestServer)
    assert.throws(() => client.assertToolExists('missing'), /not found/)
    assert.throws(() => client.assertToolCount(99), /Expected 99/)
    assert.throws(() => client.assertResourceExists('missing://x'), /not found/)
    assert.throws(() => client.assertPromptExists('missing'), /not found/)
  })
})
