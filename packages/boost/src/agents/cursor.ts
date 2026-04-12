import { existsSync, writeFileSync, mkdirSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import type { BoostAgent, SkillEntry } from './types.js'

export class CursorAgent implements BoostAgent {
  name = 'cursor'
  displayName = 'Cursor'
  supportsGuidelines = true
  supportsMcp = true
  supportsSkills = true

  detect(cwd: string): boolean {
    return existsSync(join(cwd, '.cursor')) || existsSync(join(cwd, '.cursorrules'))
  }

  async installGuidelines(cwd: string, content: string): Promise<void> {
    writeFileSync(join(cwd, '.cursorrules'), content, 'utf-8')
  }

  async installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void> {
    const dir = join(cwd, '.cursor')
    mkdirSync(dir, { recursive: true })

    const configPath = join(dir, 'mcp.json')
    const config = {
      mcpServers: {
        'rudderjs-boost': { command: mcpCommand.command, args: mcpCommand.args },
      },
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  async installSkills(cwd: string, skills: SkillEntry[]): Promise<void> {
    const dir = join(cwd, '.ai', 'skills')
    mkdirSync(dir, { recursive: true })
    for (const s of skills) {
      cpSync(s.sourcePath, join(dir, s.skillName), { recursive: true })
    }
  }
}
