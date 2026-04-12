export interface SkillEntry {
  skillName: string
  sourcePath: string
}

export interface BoostAgent {
  /** Internal identifier (e.g. 'claude-code', 'cursor') */
  name: string
  /** Display name for interactive selection */
  displayName: string
  /** Check if this agent is likely in use (config files exist, etc.) */
  detect(cwd: string): boolean
  /** Whether this agent supports guideline files */
  supportsGuidelines: boolean
  /** Whether this agent supports MCP server config */
  supportsMcp: boolean
  /** Whether this agent supports skills */
  supportsSkills: boolean
  /** Write the guideline file for this agent */
  installGuidelines(cwd: string, content: string): Promise<void>
  /** Write the MCP server config for this agent */
  installMcp(cwd: string, mcpCommand: { command: string; args: string[] }): Promise<void>
  /** Write skills for this agent (optional — not all agents support it) */
  installSkills?(cwd: string, skills: SkillEntry[]): Promise<void>
}
