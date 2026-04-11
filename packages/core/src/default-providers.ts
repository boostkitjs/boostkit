// node:fs and node:path are imported lazily inside `defaultProviders()` so this
// module stays safe to include in browser bundles. Vite externalizes node:* in
// client builds, and a top-level import would crash the browser the moment any
// client code transitively touches @rudderjs/core's barrel export.
import { resolveOptionalPeer, config } from '@rudderjs/support'
import type { Application } from './application.js'
import type { ServiceProvider } from './service-provider.js'
import type { ProviderEntry, ProviderManifest } from './provider-registry.js'
import { BUILTIN_REGISTRY } from './provider-registry.js'
import { sortByStageAndDepends } from './provider-sort.js'

export type ProviderClass = new (app: Application) => ServiceProvider

export interface DefaultProvidersOptions {
  /** Package names to skip even if installed + listed in the manifest. */
  skip?: string[]
}

/** Cached list of the entries that were loaded most recently — used by the dev-mode boot log. */
let _lastLoadedEntries: ProviderEntry[] = []

/** @internal — read by Application._bootstrapProviders() to print the dev-mode boot log. */
export function getLastLoadedProviderEntries(): ProviderEntry[] {
  return _lastLoadedEntries
}

/**
 * Returns the framework's default provider classes, sorted by stage + depends.
 *
 * Resolution order:
 *   1. `bootstrap/cache/providers.json` manifest if it exists (run `pnpm rudder providers:discover`).
 *   2. Built-in minimal registry as fallback (so cold dev clones boot).
 *
 * Each entry's `package` is dynamically imported via `resolveOptionalPeer`.
 * Missing non-optional packages log a warning and are skipped; missing optional
 * packages are skipped silently. Entries with `autoDiscover: false` are dropped
 * — set this in your `package.json`'s `rudderjs` field to opt out.
 *
 * Multi-driver collisions (e.g. orm-prisma + orm-drizzle) are resolved via
 * `config('database.driver')`; first installed wins if no driver is configured.
 *
 * Async because it calls `import()` under the hood — use top-level await in
 * `bootstrap/providers.ts`. Resolution happens once at module load.
 *
 * @example
 * // bootstrap/providers.ts
 * import { defaultProviders } from '@rudderjs/core'
 * import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
 *
 * export default [
 *   ...(await defaultProviders()),
 *   AppServiceProvider,
 * ]
 *
 * @example
 * // Skip a specific framework provider
 * export default [
 *   ...(await defaultProviders({ skip: ['@rudderjs/horizon'] })),
 *   AppServiceProvider,
 * ]
 */
export async function defaultProviders(options: DefaultProvidersOptions = {}): Promise<ProviderClass[]> {
  const skip = new Set(options.skip ?? [])

  // Lazy-load node:* so this module stays browser-safe at the top level.
  const { readFileSync } = await import('node:fs')
  const path             = await import('node:path')

  // 1. Try the build-time manifest first
  let entries: ProviderEntry[]
  try {
    const manifestPath = path.join(process.cwd(), 'bootstrap/cache/providers.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ProviderManifest
    entries = manifest.providers
  } catch {
    // 2. Fall back to the built-in minimal registry, sort it ourselves
    entries = sortByStageAndDepends(BUILTIN_REGISTRY)
  }

  // 3. Drop entries explicitly opted out of auto-discovery
  entries = entries.filter(e => e.autoDiscover !== false)

  // 4. Resolve multi-driver collisions (e.g. orm-prisma vs orm-drizzle)
  entries = resolveMultiDriver(entries, '@rudderjs/orm-', 'database.driver')

  // 5. Filter installed + skipped, then resolve each class
  const providers: ProviderClass[] = []
  const loaded:    ProviderEntry[] = []

  for (const entry of entries) {
    if (skip.has(entry.package)) continue

    let mod: Record<string, unknown>
    try {
      mod = await resolveOptionalPeer(entry.package)
    } catch {
      if (!entry.optional) {
        console.warn(
          `[RudderJS] ${entry.package} listed in the provider manifest but not installed. ` +
          `Run \`pnpm rudder providers:discover\` after installing or removing packages.`,
        )
      }
      continue
    }

    const ProviderClass = mod[entry.provider]
    if (typeof ProviderClass !== 'function') {
      throw new Error(
        `[RudderJS] ${entry.package} declared provider "${entry.provider}" in package.json ` +
        `but no such class is exported from its main entry.`,
      )
    }

    providers.push(ProviderClass as ProviderClass)
    loaded.push(entry)
  }

  _lastLoadedEntries = loaded
  return providers
}

/**
 * When multiple packages share a prefix (e.g. `@rudderjs/orm-prisma`,
 * `@rudderjs/orm-drizzle`), pick one driver based on a config key.
 * The chosen driver wins; the others are filtered out of the entry list.
 *
 * Falls back to "first installed wins" when the config key is unset.
 */
function resolveMultiDriver(
  entries:   ProviderEntry[],
  prefix:    string,
  configKey: string,
): ProviderEntry[] {
  const drivers = entries.filter(e => e.package.startsWith(prefix))
  if (drivers.length <= 1) return entries

  const chosen = config<string>(configKey)
  let winner: ProviderEntry | undefined

  if (chosen) {
    winner = drivers.find(d => d.package.includes(chosen))
    if (!winner) {
      throw new Error(
        `[RudderJS] Multiple ${prefix}* drivers installed but config('${configKey}') is "${chosen}", ` +
        `which doesn't match any of: ${drivers.map(d => d.package).join(', ')}.`,
      )
    }
  } else {
    winner = drivers[0]
  }

  return entries.filter(e => !drivers.includes(e) || e === winner)
}
