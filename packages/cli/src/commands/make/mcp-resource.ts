import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Command } from 'commander'
import chalk from 'chalk'

export function stub(className: string): string {
  return `import { McpResource, Description } from '@rudderjs/mcp'

@Description('Describe what this resource provides.')
export class ${className} extends McpResource {
  uri(): string {
    return 'app://${className.replace(/Resource$/, '').toLowerCase()}'
  }

  mimeType(): string {
    return 'text/plain'
  }

  async handle(): Promise<string> {
    // Return resource content here
    return 'Resource content'
  }
}
`
}

export function makeMcpResource(program: Command): void {
  program
    .command('make:mcp-resource <name>')
    .description('Create a new MCP resource class')
    .option('-f, --force', 'Overwrite if file already exists')
    .action(async (name: string, opts: { force?: boolean }) => {
      const className = name.endsWith('Resource') ? name : `${name}Resource`
      const relPath   = `app/Mcp/Resources/${className}.ts`
      const outPath   = resolve(process.cwd(), relPath)

      if (existsSync(outPath) && !opts.force) {
        console.error(chalk.red(`  ✗ Already exists: ${relPath}`))
        console.error(chalk.dim('    Use --force to overwrite.'))
        return
      }

      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, stub(className))

      console.log(chalk.green('  ✔ MCP resource created:'), chalk.cyan(relPath))
    })
}
