import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getAppInfo } from './tools/app-info.js'
import { getDbSchema } from './tools/db-schema.js'
import { getConfigValue } from './tools/config-get.js'
import { getRouteList } from './tools/route-list.js'
import { getModelList } from './tools/model-list.js'
import { getLastError } from './tools/last-error.js'

export function createBoostServer(cwd: string): McpServer {
  const server = new McpServer(
    { name: 'rudderjs-boost', version: '0.0.1' },
    { capabilities: { tools: {}, resources: {} } },
  )

  // ── app_info ──────────────────────────────────────────

  server.registerTool('app_info', {
    title: 'Application Info',
    description: 'Get RudderJS application info: installed packages, versions, Node.js version, package manager.',
  }, async () => {
    const info = getAppInfo(cwd)
    return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] }
  })

  // ── db_schema ─────────────────────────────────────────

  server.registerTool('db_schema', {
    title: 'Database Schema',
    description: 'Read the Prisma database schema. Returns parsed models with fields and types, plus the raw .prisma content.',
    inputSchema: {
      format: z.enum(['parsed', 'raw']).default('parsed').describe('Output format: "parsed" for structured JSON, "raw" for full .prisma source'),
    },
  }, async ({ format }) => {
    const schema = getDbSchema(cwd)
    const output = format === 'raw' ? (schema.raw ?? 'No schema found') : JSON.stringify(schema.models, null, 2)
    return { content: [{ type: 'text' as const, text: output }] }
  })

  // ── route_list ────────────────────────────────────────

  server.registerTool('route_list', {
    title: 'Route List',
    description: 'List all registered HTTP routes with methods, paths, middleware, and source files.',
  }, async () => {
    const routes = getRouteList(cwd)
    if (routes.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No routes found in routes/api.ts or routes/web.ts' }] }
    }
    const table = routes.map(r =>
      `${r.method.padEnd(7)} ${r.path.padEnd(40)} ${r.middleware.length > 0 ? `[${r.middleware.join(', ')}]` : ''} (${r.file})`
    ).join('\n')
    return { content: [{ type: 'text' as const, text: table }] }
  })

  // ── model_list ────────────────────────────────────────

  server.registerTool('model_list', {
    title: 'Model List',
    description: 'List all ORM models in app/Models/ with table names, fields, and types.',
  }, async () => {
    const models = getModelList(cwd)
    if (models.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No models found in app/Models/' }] }
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(models, null, 2) }] }
  })

  // ── config_get ────────────────────────────────────────

  server.registerTool('config_get', {
    title: 'Read Config',
    description: 'Read application config files. Pass no key to list available configs, or a key like "app" to read config/app.ts.',
    inputSchema: {
      key: z.string().optional().describe('Config key — e.g. "app", "database", "auth". Omit to list all config files.'),
    },
  }, async ({ key }) => {
    const result = getConfigValue(cwd, key)
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    return { content: [{ type: 'text' as const, text }] }
  })

  // ── last_error ────────────────────────────────────────

  server.registerTool('last_error', {
    title: 'Last Error',
    description: 'Read the latest log entries from the application logs.',
    inputSchema: {
      count: z.number().default(10).describe('Number of recent log lines to return'),
    },
  }, async ({ count }) => {
    const lines = getLastError(cwd, count)
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
  })

  return server
}

/**
 * Start the MCP server on stdio transport.
 * Called by `rudder boost:mcp`.
 */
export async function startBoostMcp(cwd: string): Promise<void> {
  const server = createBoostServer(cwd)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
