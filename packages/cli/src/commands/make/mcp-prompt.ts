import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Command } from 'commander'
import chalk from 'chalk'

export function stub(className: string): string {
  return `import { McpPrompt, Description } from '@rudderjs/mcp'
import type { McpPromptMessage } from '@rudderjs/mcp'
import { z } from 'zod'

@Description('Describe what this prompt does.')
export class ${className} extends McpPrompt {
  arguments() {
    return z.object({
      // Define your prompt arguments here
    })
  }

  async handle(args: Record<string, unknown>): Promise<McpPromptMessage[]> {
    return [
      { role: 'user', content: 'Summarize the following data...' },
    ]
  }
}
`
}

export function makeMcpPrompt(program: Command): void {
  program
    .command('make:mcp-prompt <name>')
    .description('Create a new MCP prompt class')
    .option('-f, --force', 'Overwrite if file already exists')
    .action(async (name: string, opts: { force?: boolean }) => {
      const className = name.endsWith('Prompt') ? name : `${name}Prompt`
      const relPath   = `app/Mcp/Prompts/${className}.ts`
      const outPath   = resolve(process.cwd(), relPath)

      if (existsSync(outPath) && !opts.force) {
        console.error(chalk.red(`  ✗ Already exists: ${relPath}`))
        console.error(chalk.dim('    Use --force to overwrite.'))
        return
      }

      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, stub(className))

      console.log(chalk.green('  ✔ MCP prompt created:'), chalk.cyan(relPath))
    })
}
