import 'reflect-metadata'
import { Container, container } from '@forge/di'
import { Env } from '@forge/support'

// ─── Service Provider ──────────────────────────────────────

export abstract class ServiceProvider {
  constructor(protected app: Application) {}

  /** Register bindings into the container */
  abstract register(): void

  /** Called after all providers are registered */
  boot?(): void | Promise<void>
}

// ─── Config ────────────────────────────────────────────────

export interface AppConfig {
  name?: string
  env?: string
  debug?: boolean
  providers?: (new (app: Application) => ServiceProvider)[]
}

// ─── Application ───────────────────────────────────────────

export class Application {
  private static instance: Application
  readonly container: Container
  private providers: ServiceProvider[] = []
  private booted = false

  readonly name:  string
  readonly env:   string
  readonly debug: boolean

  private constructor(config: AppConfig = {}) {
    this.container = container
    this.name  = config.name  ?? Env.get('APP_NAME',  'Forge')
    this.env   = config.env   ?? Env.get('APP_ENV',   'production')
    this.debug = config.debug ?? Env.getBool('APP_DEBUG', false)

    // Bind the app itself into the container
    this.container.instance('app', this)
    this.container.instance('Application', this)

    // Register providers
    for (const Provider of config.providers ?? []) {
      this.providers.push(new Provider(this))
    }
  }

  /** Create or return the singleton Application instance */
  static create(config?: AppConfig): Application {
    if (!Application.instance) {
      Application.instance = new Application(config)
    }
    return Application.instance
  }

  /** Get the global app instance */
  static getInstance(): Application {
    if (!Application.instance) {
      throw new Error('[Forge] Application has not been created yet. Call Application.create() first.')
    }
    return Application.instance
  }

  // ── Container proxy methods ───────────────────────────────

  bind<T>(token: Parameters<Container['bind']>[0], factory: Parameters<Container['bind']>[1]): this {
    this.container.bind(token, factory)
    return this
  }

  singleton<T>(token: Parameters<Container['singleton']>[0], factory: Parameters<Container['singleton']>[1]): this {
    this.container.singleton(token, factory)
    return this
  }

  instance<T>(token: Parameters<Container['instance']>[0], value: T): this {
    this.container.instance(token, value)
    return this
  }

  make<T>(token: Parameters<Container['make']>[0]): T {
    return this.container.make(token) as T
  }

  // ── Lifecycle ─────────────────────────────────────────────

  /** Register all service providers */
  private register(): void {
    for (const provider of this.providers) {
      provider.register()
    }
  }

  /** Boot all service providers */
  private async boot(): Promise<void> {
    for (const provider of this.providers) {
      await provider.boot?.()
    }
    this.booted = true
  }

  /** Bootstrap the application (register + boot) */
  async bootstrap(): Promise<this> {
    if (this.booted) return this
    this.register()
    await this.boot()
    return this
  }

  isBooted(): boolean {
    return this.booted
  }

  isProduction(): boolean {
    return this.env === 'production'
  }

  isDevelopment(): boolean {
    return this.env === 'development' || this.env === 'local'
  }
}

// ─── Global helpers ────────────────────────────────────────

/** Get the global application instance */
export const app = (): Application => Application.getInstance()

/** Resolve something from the container */
export const resolve = <T>(token: Parameters<Container['make']>[0]): T =>
  Application.getInstance().make<T>(token)

// ─── Re-exports ────────────────────────────────────────────

export { Container, container } from '@forge/di'
export { Injectable, Inject } from '@forge/di'
export { Collection, Env, sleep, ucfirst, tap, pick, omit } from '@forge/support'