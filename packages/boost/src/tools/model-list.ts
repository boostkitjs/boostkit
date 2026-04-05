import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

interface ModelInfo {
  name: string
  file: string
  table: string | null
  fields: string[]
}

export function getModelList(cwd: string): ModelInfo[] {
  const models: ModelInfo[] = []

  const modelsDir = join(cwd, 'app', 'Models')
  if (!existsSync(modelsDir)) return models

  const files = readdirSync(modelsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))

  for (const file of files) {
    const content = readFileSync(join(modelsDir, file), 'utf8')
    const name = basename(file, file.endsWith('.ts') ? '.ts' : '.js')

    // Extract table name
    const tableMatch = content.match(/static\s+table\s*=\s*['"`](\w+)['"`]/)
    const table = tableMatch ? tableMatch[1]! : null

    // Extract fields (property declarations with !)
    const fields: string[] = []
    const fieldRegex = /(\w+)!\s*:\s*([^\n;]+)/g
    let match: RegExpExecArray | null
    while ((match = fieldRegex.exec(content)) !== null) {
      fields.push(`${match[1]}: ${match[2]!.trim()}`)
    }

    models.push({ name, file: `app/Models/${file}`, table, fields })
  }

  return models
}
