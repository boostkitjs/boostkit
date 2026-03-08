import type { Application } from './index.js'

// ─── Publish registry ──────────────────────────────────────

export interface PublishGroup {
  /** Absolute path to the source file or directory to copy. */
  from: string
  /** Destination path relative to the app root. */
  to:   string
  /** Optional tag for selective publishing (e.g. 'panels-pages'). */
  tag?: string
}

const _g = globalThis as Record<string, unknown>
const _key = '__boostkit_publish_registry__'
if (!_g[_key]) _g[_key] = new Map<string, PublishGroup[]>()

/** @internal — read by the vendor:publish artisan command */
export function getPublishGroups(): Map<string, PublishGroup[]> {
  return _g[_key] as Map<string, PublishGroup[]>
}

// ─── Service Provider ──────────────────────────────────────

export abstract class ServiceProvider {
  constructor(protected app: Application) {}

  /** Register bindings into the container */
  abstract register(): void

  /** Called after all providers are registered */
  boot?(): void | Promise<void>

  /**
   * Register assets that can be published to the application with `vendor:publish`.
   *
   * @example
   * this.publishes({
   *   from: new URL('../pages', import.meta.url).pathname,
   *   to:   'pages/(panels)',
   *   tag:  'panels-pages',
   * })
   */
  protected publishes(group: PublishGroup | PublishGroup[]): void {
    // Anonymous classes (e.g. from factory functions) have constructor.name === ''.
    // Walk up the prototype chain to find the nearest named class.
    let name = this.constructor.name
    if (!name) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let proto: any = Object.getPrototypeOf(this)
      while (proto && !proto.constructor.name) {
        proto = Object.getPrototypeOf(proto)
      }
      name = proto?.constructor.name ?? 'ServiceProvider'
    }
    const items    = Array.isArray(group) ? group : [group]
    const registry = getPublishGroups()
    registry.set(name, [...(registry.get(name) ?? []), ...items])
  }
}
