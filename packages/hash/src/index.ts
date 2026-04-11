import { ServiceProvider, type Application } from '@rudderjs/core'

// ─── Hash Driver Contract ─────────────────────────────────

export interface HashDriver {
  make(value: string): Promise<string>
  check(value: string, hashed: string): Promise<boolean>
  needsRehash(hashed: string): boolean
}

// ─── Hash Registry ────────────────────────────────────────

export class HashRegistry {
  private static driver: HashDriver | null = null

  static set(driver: HashDriver): void   { this.driver = driver }
  static get(): HashDriver | null        { return this.driver }
  /** @internal */
  static reset(): void                   { this.driver = null }
}

// ─── Hash Facade ──────────────────────────────────────────

export class Hash {
  private static driver(): HashDriver {
    const d = HashRegistry.get()
    if (!d) throw new Error('[RudderJS Hash] No hash driver registered. Add hash() to providers.')
    return d
  }

  /** Hash a plain-text value. */
  static make(value: string): Promise<string> {
    return this.driver().make(value)
  }

  /** Check a plain-text value against a hash. */
  static check(value: string, hashed: string): Promise<boolean> {
    return this.driver().check(value, hashed)
  }

  /** Determine if a hash needs to be rehashed (e.g. cost changed). */
  static needsRehash(hashed: string): boolean {
    return this.driver().needsRehash(hashed)
  }
}

// ─── Bcrypt Driver (built-in) ─────────────────────────────

export interface BcryptConfig {
  rounds?: number
}

export class BcryptDriver implements HashDriver {
  private readonly rounds: number

  constructor(config?: BcryptConfig) {
    this.rounds = config?.rounds ?? 12
  }

  async make(value: string): Promise<string> {
    const bcrypt = (await import('bcryptjs')).default
    return bcrypt.hash(value, this.rounds)
  }

  async check(value: string, hashed: string): Promise<boolean> {
    const bcrypt = (await import('bcryptjs')).default
    return bcrypt.compare(value, hashed)
  }

  needsRehash(hashed: string): boolean {
    const match = hashed.match(/^\$2[aby]?\$(\d{2})\$/)
    if (!match) return true
    return parseInt(match[1]!, 10) !== this.rounds
  }
}

// ─── Argon2 Driver (optional, requires argon2) ───────────

export interface Argon2Config {
  memory?: number
  time?: number
  threads?: number
}

export class Argon2Driver implements HashDriver {
  private readonly memory: number
  private readonly time: number
  private readonly threads: number

  constructor(config?: Argon2Config) {
    this.memory  = config?.memory  ?? 65536
    this.time    = config?.time    ?? 3
    this.threads = config?.threads ?? 4
  }

  async make(value: string): Promise<string> {
    const argon2 = await import('argon2')
    return argon2.hash(value, {
      type:        2, // argon2id
      memoryCost:  this.memory,
      timeCost:    this.time,
      parallelism: this.threads,
    })
  }

  async check(value: string, hashed: string): Promise<boolean> {
    const argon2 = await import('argon2')
    return argon2.verify(hashed, value)
  }

  needsRehash(hashed: string): boolean {
    // Argon2 encodes params in the hash: $argon2id$v=19$m=65536,t=3,p=4$...
    const match = hashed.match(/\$m=(\d+),t=(\d+),p=(\d+)\$/)
    if (!match) return true
    return (
      parseInt(match[1]!, 10) !== this.memory  ||
      parseInt(match[2]!, 10) !== this.time    ||
      parseInt(match[3]!, 10) !== this.threads
    )
  }
}

// ─── Config ───────────────────────────────────────────────

export interface HashConfig {
  driver: 'bcrypt' | 'argon2'
  bcrypt?: BcryptConfig
  argon2?: Argon2Config
}

// ─── Service Provider Factory ─────────────────────────────

/**
 * Returns a HashServiceProvider class configured for the given hash config.
 *
 * Built-in drivers:  bcrypt  (default, uses bcryptjs)
 *                    argon2  (requires argon2: pnpm add argon2)
 *
 * Usage in bootstrap/providers.ts:
 *   import { hash } from '@rudderjs/hash'
 *   import configs from '../config/index.js'
 *   export default [..., hash(configs.hash), ...]
 */
export function hashProvider(config: HashConfig): new (app: Application) => ServiceProvider {
  class HashServiceProvider extends ServiceProvider {
    register(): void {}

    async boot(): Promise<void> {
      let driver: HashDriver

      if (config.driver === 'bcrypt') {
        driver = new BcryptDriver(config.bcrypt)
      } else if (config.driver === 'argon2') {
        driver = new Argon2Driver(config.argon2)
      } else {
        throw new Error(`[RudderJS Hash] Unknown driver "${config.driver as string}". Available: bcrypt, argon2`)
      }

      HashRegistry.set(driver)
      this.app.instance('hash', driver)
    }
  }

  return HashServiceProvider
}
