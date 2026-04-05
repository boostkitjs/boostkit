import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

export function getConfigValue(cwd: string, key?: string): Record<string, unknown> | string {
  const configDir = join(cwd, 'config')
  if (!existsSync(configDir)) return { error: 'No config/ directory found' }

  const files = readdirSync(configDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))

  if (!key) {
    // Return list of config files
    return {
      files: files.map(f => basename(f, f.endsWith('.ts') ? '.ts' : '.js')),
      hint: 'Pass a key like "app" to read config/app.ts, or "app.name" for a specific value.',
    }
  }

  const [fileKey] = key.split('.')
  const file = files.find(f => basename(f, f.endsWith('.ts') ? '.ts' : '.js') === fileKey)
  if (!file) return { error: `Config file "${fileKey}" not found. Available: ${files.map(f => basename(f, '.ts')).join(', ')}` }

  // Return raw file content — we can't import TS files at runtime,
  // but the AI can read and understand the source.
  const content = readFileSync(join(configDir, file), 'utf8')
  return content
}
