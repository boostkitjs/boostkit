import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Command } from 'commander'
import chalk from 'chalk'

export function stub(className: string): string {
  return `import { McpServer } from '@rudderjs/mcp'
import { Name, Version, Instructions } from '@rudderjs/mcp'

@Name('${className.replace(/Server$/, '')} Server')
@Version('1.0.0')
@Instructions('Provide a description of this MCP server.')
export class ${className} extends McpServer {
  protected tools = [
    // Add your tool classes here
  ]

  protected resources = [
    // Add your resource classes here
  ]

  protected prompts = [
    // Add your prompt classes here
  ]
}
`
}

export function makeMcpServer(program: Command): void {
  program
    .command('make:mcp-server <name>')
    .description('Create a new MCP server class')
    .option('-f, --force', 'Overwrite if file already exists')
    .action(async (name: string, opts: { force?: boolean }) => {
      const className = name.endsWith('Server') ? name : `${name}Server`
      const relPath   = `app/Mcp/Servers/${className}.ts`
      const outPath   = resolve(process.cwd(), relPath)

      if (existsSync(outPath) && !opts.force) {
        console.error(chalk.red(`  ✗ Already exists: ${relPath}`))
        console.error(chalk.dim('    Use --force to overwrite.'))
        return
      }

      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, stub(className))

      console.log(chalk.green('  ✔ MCP server created:'), chalk.cyan(relPath))
    })
}
