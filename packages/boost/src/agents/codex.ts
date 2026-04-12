import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent } from './types.js'

export class CodexAgent implements BoostAgent {
  name = 'codex'
  displayName = 'Codex CLI'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = false

  detect(cwd: string): boolean {
    return existsSync(join(cwd, 'AGENTS.md'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    writeFileSync(join(cwd, 'AGENTS.md'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    // Codex uses the same .mcp.json format
    const config = {
      mcpServers: {
        'rudderjs-boost': mcpCommand,
      },
    }
    writeFileSync(join(cwd, '.mcp.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }
}
