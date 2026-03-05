import path from 'node:path'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

// ─── Types ─────────────────────────────────────────────────

type UiFramework = 'react' | 'vue' | 'solid'

export interface BoostkitOptions {
  /**
   * UI framework(s) to enable.
   * - 'react'  → @vitejs/plugin-react
   * - 'vue'    → @vitejs/plugin-vue
   * - 'solid'  → vike-solid/vite
   * - array    → multiple frameworks (e.g. ['react', 'vue'])
   * - 'none'   → no UI plugin (API-only or custom setup)
   *
   * @default 'react'
   */
  ui?: UiFramework | UiFramework[] | 'none'
}

// ─── SSR / build externals ─────────────────────────────────

/**
 * Packages that must never be bundled — either CLI-only (Node.js interactive
 * prompts) or optional adapter peers loaded at runtime based on driver config.
 */
const SSR_EXTERNALS = [
  '@clack/core',
  '@clack/prompts',
  '@boostkit/queue-inngest',
  '@boostkit/queue-bullmq',
  '@boostkit/mail-nodemailer',
  '@boostkit/orm-drizzle',
]

// ─── Helpers ───────────────────────────────────────────────

const _require = createRequire(import.meta.url)

function tryLoad<T>(id: string): T | null {
  try {
    return _require(id) as T
  } catch {
    return null
  }
}

// ─── UI plugin builders ────────────────────────────────────

function reactPlugins(hasSolid: boolean): Plugin[] {
  const mod = tryLoad<{ default: (opts?: unknown) => Plugin }>('@vitejs/plugin-react')
  if (!mod) {
    console.warn('[BoostKit] @vitejs/plugin-react not found — install it to enable React support.')
    return []
  }
  const opts = hasSolid ? { exclude: ['**/pages/solid*/**'] } : {}
  return [mod.default(opts)]
}

function vuePlugins(): Plugin[] {
  const mod = tryLoad<{ default: (opts?: unknown) => Plugin }>('@vitejs/plugin-vue')
  if (!mod) {
    console.warn('[BoostKit] @vitejs/plugin-vue not found — install it to enable Vue support.')
    return []
  }
  return [mod.default()]
}

function solidPlugins(hasReact: boolean): Plugin[] {
  const mod = tryLoad<{ default: (opts?: unknown) => Plugin }>('vike-solid/vite')
  if (!mod) {
    console.warn('[BoostKit] vike-solid not found — install it to enable Solid support.')
    return []
  }
  const opts = hasReact ? { include: ['**/pages/solid*/**'] } : {}
  return [mod.default(opts)]
}

// ─── Main plugin ───────────────────────────────────────────

/**
 * BoostKit Vite plugin.
 *
 * Configures Vike, the chosen UI framework(s), SSR externals,
 * and the @/ path alias — all from a single call.
 *
 * @example
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import boostkit from '@boostkit/vite'
 * import tailwindcss from '@tailwindcss/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     boostkit({ ui: 'react' }),
 *     tailwindcss(),
 *   ],
 * })
 */
export function boostkit(options: BoostkitOptions = {}): Plugin[] {
  const ui = options.ui ?? 'react'
  const frameworks: UiFramework[] = ui === 'none' ? [] : Array.isArray(ui) ? ui : [ui]

  const hasReact = frameworks.includes('react')
  const hasVue   = frameworks.includes('vue')
  const hasSolid = frameworks.includes('solid')

  // Load vike — required peer
  const vikeMod = tryLoad<{ default: (opts?: unknown) => Plugin }>('vike/plugin')
  if (!vikeMod) throw new Error('[BoostKit] vike is not installed. Run: pnpm add vike')

  const plugins: Plugin[] = [
    // Vike — suppress request/response noise, keep warnings
    vikeMod.default({ logLevel: 'warn' }) as Plugin,

    // UI frameworks
    ...(hasReact ? reactPlugins(hasSolid) : []),
    ...(hasVue   ? vuePlugins()           : []),
    ...(hasSolid ? solidPlugins(hasReact) : []),

    // BoostKit config plugin — alias + SSR externals
    {
      name: 'boostkit:config',
      config() {
        return {
          resolve: {
            alias: {
              '@': path.resolve(process.cwd(), 'src'),
            },
          },
          ssr: {
            external: SSR_EXTERNALS,
          },
          build: {
            rollupOptions: {
              external: (id: string) =>
                SSR_EXTERNALS.some(e => id === e || id.startsWith(e + '/')),
            },
          },
        }
      },
    },
  ]

  return plugins
}

export default boostkit
