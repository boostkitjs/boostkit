import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent } from './types.js'

export class GeminiAgent implements BoostAgent {
  name = 'gemini'
  displayName = 'Gemini CLI'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = false

  detect(cwd: string): boolean {
    return existsSync(join(cwd, '.gemini')) || existsSync(join(cwd, 'GEMINI.md'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    writeFileSync(join(cwd, 'GEMINI.md'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    const dir = join(cwd, '.gemini')
    mkdirSync(dir, { recursive: true })

    const configPath = join(dir, 'settings.json')
    const config = {
      mcpServers: {
        'rudderjs-boost': { command: mcpCommand.command, args: mcpCommand.args },
      },
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }
}
