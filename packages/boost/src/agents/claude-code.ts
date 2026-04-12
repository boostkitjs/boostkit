import { existsSync, writeFileSync, mkdirSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent, SkillEntry } from './types.js'

export class ClaudeCodeAgent implements BoostAgent {
  name = 'claude-code'
  displayName = 'Claude Code'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = true

  detect(cwd: string): boolean {
    return existsSync(join(cwd, '.mcp.json')) || existsSync(join(cwd, 'CLAUDE.md'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    writeFileSync(join(cwd, 'CLAUDE.md'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    const config = {
      mcpServers: {
        'rudderjs-boost': mcpCommand,
      },
    }
    writeFileSync(join(cwd, '.mcp.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  async installSkills(cwd: string, skills: SkillEntry[]): Promise<void> {
    const dir = join(cwd, '.ai', 'skills')
    mkdirSync(dir, { recursive: true })
    for (const s of skills) {
      cpSync(s.sourcePath, join(dir, s.skillName), { recursive: true })
    }
  }
}
