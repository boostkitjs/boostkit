import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent } from './types.js'

export class CopilotAgent implements BoostAgent {
  name = 'copilot'
  displayName = 'GitHub Copilot'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = false

  detect(cwd: string): boolean {
    return existsSync(join(cwd, '.github', 'copilot-instructions.md')) || existsSync(join(cwd, '.vscode'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    const dir = join(cwd, '.github')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'copilot-instructions.md'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    const dir = join(cwd, '.vscode')
    mkdirSync(dir, { recursive: true })

    const configPath = join(dir, 'mcp.json')
    const config = {
      servers: {
        'rudderjs-boost': { command: mcpCommand.command, args: mcpCommand.args },
      },
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }
}
