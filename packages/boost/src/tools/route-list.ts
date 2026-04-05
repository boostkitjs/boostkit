import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface RouteInfo {
  method: string
  path: string
  middleware: string[]
  file: string
}

export function getRouteList(cwd: string): RouteInfo[] {
  const routes: RouteInfo[] = []

  // Parse route files for Route.get/post/put/delete/all patterns
  const routeFiles = [
    join(cwd, 'routes', 'api.ts'),
    join(cwd, 'routes', 'web.ts'),
  ]

  for (const file of routeFiles) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf8')
    const fileName = file.includes('api.ts') ? 'routes/api.ts' : 'routes/web.ts'

    // Match Route.method('/path', ...) patterns
    const regex = /Route\.(get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      const method = match[1]!.toUpperCase()
      const path = match[2]!

      // Try to detect middleware — look for array in the same statement
      const lineStart = content.lastIndexOf('\n', match.index) + 1
      const lineEnd = content.indexOf('\n', match.index + match[0].length)
      // Look ahead for the full statement (may span multiple lines)
      const closingParen = findClosingParen(content, match.index + match[0].length - 1)
      const statement = content.slice(match.index, closingParen + 1)
      const mwMatch = statement.match(/\[([^\]]+)\]/)
      const middleware = mwMatch
        ? mwMatch[1]!.split(',').map(m => m.trim().replace(/\(\)/g, '')).filter(Boolean)
        : []

      routes.push({ method, path, middleware, file: fileName })
    }
  }

  return routes
}

function findClosingParen(content: string, start: number): number {
  let depth = 0
  for (let i = start; i < content.length; i++) {
    if (content[i] === '(') depth++
    if (content[i] === ')') {
      depth--
      if (depth <= 0) return i
    }
  }
  return content.length
}
