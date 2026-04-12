import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent } from './types.js'

export class WindsurfAgent implements BoostAgent {
  name = 'windsurf'
  displayName = 'Windsurf'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = false

  detect(cwd: string): boolean {
    return existsSync(join(cwd, '.windsurf')) || existsSync(join(cwd, '.windsurfrules'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    writeFileSync(join(cwd, '.windsurfrules'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    const dir = join(cwd, '.windsurf')
    mkdirSync(dir, { recursive: true })

    const configPath = join(dir, 'mcp.json')
    const config = {
      mcpServers: {
        'rudderjs-boost': { command: mcpCommand.command, args: mcpCommand.args },
      },
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }
}
