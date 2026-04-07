import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Command } from 'commander'
import chalk from 'chalk'

export function stub(className: string): string {
  return `import { McpTool, McpResponse, Description } from '@rudderjs/mcp'
import { z } from 'zod'

@Description('Describe what this tool does.')
export class ${className} extends McpTool {
  schema() {
    return z.object({
      // Define your input parameters here
    })
  }

  async handle(input: Record<string, unknown>) {
    // Implement your tool logic here
    return McpResponse.text('Hello from ${className.replace(/Tool$/, '')}')
  }
}
`
}

export function makeMcpTool(program: Command): void {
  program
    .command('make:mcp-tool <name>')
    .description('Create a new MCP tool class')
    .option('-f, --force', 'Overwrite if file already exists')
    .action(async (name: string, opts: { force?: boolean }) => {
      const className = name.endsWith('Tool') ? name : `${name}Tool`
      const relPath   = `app/Mcp/Tools/${className}.ts`
      const outPath   = resolve(process.cwd(), relPath)

      if (existsSync(outPath) && !opts.force) {
        console.error(chalk.red(`  ✗ Already exists: ${relPath}`))
        console.error(chalk.dim('    Use --force to overwrite.'))
        return
      }

      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, stub(className))

      console.log(chalk.green('  ✔ MCP tool created:'), chalk.cyan(relPath))
    })
}
