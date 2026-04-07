import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync } from 'node:fs'
import { join } from 'node:path'

interface BoostConfig {
  version: string
  packages: string[]
  generatedAt: string
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function scanInstalledPackages(cwd: string): string[] {
  const pkgJsonPath = join(cwd, 'package.json')
  if (!existsSync(pkgJsonPath)) return []

  const raw = readFileSync(pkgJsonPath, 'utf-8')
  const pkg: PackageJson = JSON.parse(raw) as PackageJson
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

  return Object.keys(allDeps).filter((name) => name.startsWith('@rudderjs/'))
}

function readBoostJson(cwd: string): BoostConfig | undefined {
  const filePath = join(cwd, 'boost.json')
  if (!existsSync(filePath)) return undefined

  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as BoostConfig
}

function updateGuidelines(cwd: string, packages: string[]): number {
  const dir = join(cwd, '.ai', 'guidelines')
  mkdirSync(dir, { recursive: true })

  let count = 0
  for (const pkg of packages) {
    const shortName = pkg.replace('@rudderjs/', '')
    const guidelinePath = join(cwd, 'node_modules', pkg, 'boost', 'guidelines.md')
    if (existsSync(guidelinePath)) {
      const content = readFileSync(guidelinePath, 'utf-8')
      const dest = join(dir, `${shortName}.md`)
      writeFileSync(dest, content, 'utf-8')
      console.log(`  Updated .ai/guidelines/${shortName}.md`)
      count++
    }
  }

  return count
}

function updateSkills(cwd: string, packages: string[]): number {
  const dir = join(cwd, '.ai', 'skills')
  mkdirSync(dir, { recursive: true })

  let count = 0
  for (const pkg of packages) {
    const skillsDir = join(cwd, 'node_modules', pkg, 'boost', 'skills')
    if (!existsSync(skillsDir)) continue

    try {
      const entries = readdirSync(skillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMd = join(skillsDir, entry.name, 'SKILL.md')
          if (existsSync(skillMd)) {
            const dest = join(dir, entry.name)
            cpSync(join(skillsDir, entry.name), dest, { recursive: true })
            console.log(`  Updated .ai/skills/${entry.name}/`)
            count++
          }
        }
      }
    } catch {
      // skip unreadable directories
    }
  }

  return count
}

export interface BoostUpdateOptions {
  discover?: boolean
}

export async function boostUpdate(cwd: string, options?: BoostUpdateOptions): Promise<void> {
  console.log('\nBoost: Updating AI guidelines and skills...\n')

  const existing = readBoostJson(cwd)
  if (!existing) {
    console.log('  No boost.json found. Run `boost:install` first.')
    return
  }

  let packages = existing.packages

  if (options?.discover) {
    const installed = scanInstalledPackages(cwd)
    const newPackages = installed.filter((p) => !packages.includes(p))
    if (newPackages.length > 0) {
      console.log(`  Discovered ${newPackages.length} new package(s): ${newPackages.join(', ')}`)
      packages = [...packages, ...newPackages]
    }
  }

  const guidelineCount = updateGuidelines(cwd, packages)
  const skillCount = updateSkills(cwd, packages)

  // Update boost.json
  const config = {
    version: existing.version,
    packages,
    generatedAt: new Date().toISOString(),
  }
  writeFileSync(join(cwd, 'boost.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8')
  console.log('  Updated boost.json')

  console.log(`\n  ${guidelineCount} guideline(s), ${skillCount} skill(s) updated.`)
  console.log('  CLAUDE.md was not modified. Run `boost:install` to regenerate it.\n')
}
