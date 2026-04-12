export type { BoostAgent, SkillEntry } from './types.js'
export { ClaudeCodeAgent } from './claude-code.js'
export { CursorAgent } from './cursor.js'
export { CopilotAgent } from './copilot.js'
export { CodexAgent } from './codex.js'
export { GeminiAgent } from './gemini.js'
export { WindsurfAgent } from './windsurf.js'

import type { BoostAgent } from './types.js'
import { ClaudeCodeAgent } from './claude-code.js'
import { CursorAgent } from './cursor.js'
import { CopilotAgent } from './copilot.js'
import { CodexAgent } from './codex.js'
import { GeminiAgent } from './gemini.js'
import { WindsurfAgent } from './windsurf.js'

/** All built-in agent adapters */
export function builtInAgents(): BoostAgent[] {
  return [
    new ClaudeCodeAgent(),
    new CursorAgent(),
    new CopilotAgent(),
    new CodexAgent(),
    new GeminiAgent(),
    new WindsurfAgent(),
  ]
}
