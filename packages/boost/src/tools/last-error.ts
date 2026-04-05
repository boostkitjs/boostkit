import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export function getLastError(cwd: string, count = 5): string[] {
  // Check common log locations
  const logPaths = [
    join(cwd, 'storage', 'logs'),
    join(cwd, 'logs'),
  ]

  for (const logDir of logPaths) {
    if (!existsSync(logDir)) continue

    const files = readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, mtime: statSync(join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (files.length === 0) continue

    const latest = readFileSync(join(logDir, files[0]!.name), 'utf8')
    const lines = latest.split('\n').filter(l => l.trim())
    return lines.slice(-count)
  }

  // Fallback: no log files found — check if there's stderr output we can read
  return ['No log files found in storage/logs/ or logs/']
}
