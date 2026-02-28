// ─── Collection ────────────────────────────────────────────

export class Collection<T> {
  private items: T[]

  constructor(items: T[] = []) {
    this.items = [...items]
  }

  static of<T>(items: T[]): Collection<T> {
    return new Collection(items)
  }

  all(): T[] {
    return this.items
  }

  count(): number {
    return this.items.length
  }

  first(): T | undefined {
    return this.items[0]
  }

  last(): T | undefined {
    return this.items[this.items.length - 1]
  }

  map<U>(fn: (item: T, index: number) => U): Collection<U> {
    return new Collection(this.items.map(fn))
  }

  filter(fn: (item: T) => boolean): Collection<T> {
    return new Collection(this.items.filter(fn))
  }

  find(fn: (item: T) => boolean): T | undefined {
    return this.items.find(fn)
  }

  each(fn: (item: T, index: number) => void): this {
    this.items.forEach(fn)
    return this
  }

  pluck<K extends keyof T>(key: K): Collection<T[K]> {
    return new Collection(this.items.map(item => item[key]))
  }

  groupBy<K extends keyof T>(key: K): Record<string, T[]> {
    return this.items.reduce((acc, item) => {
      const group = String(item[key])
      acc[group] = [...(acc[group] ?? []), item]
      return acc
    }, {} as Record<string, T[]>)
  }

  contains(fn: (item: T) => boolean): boolean {
    return this.items.some(fn)
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  toArray(): T[] {
    return [...this.items]
  }

  toJSON(): string {
    return JSON.stringify(this.items)
  }
}

// ─── Env ───────────────────────────────────────────────────

export const Env = {
  get(key: string, fallback?: string): string {
    const val = process.env[key]
    if (val === undefined) {
      if (fallback !== undefined) return fallback
      throw new Error(`Missing environment variable: ${key}`)
    }
    return val
  },

  getNumber(key: string, fallback?: number): number {
    const val = process.env[key]
    if (val === undefined) {
      if (fallback !== undefined) return fallback
      throw new Error(`Missing environment variable: ${key}`)
    }
    const num = Number(val)
    if (isNaN(num)) throw new Error(`Env var ${key} is not a number`)
    return num
  },

  getBool(key: string, fallback?: boolean): boolean {
    const val = process.env[key]
    if (val === undefined) {
      if (fallback !== undefined) return fallback
      throw new Error(`Missing environment variable: ${key}`)
    }
    return val === 'true' || val === '1'
  },

  has(key: string): boolean {
    return process.env[key] !== undefined
  },
}

// ─── Helpers ───────────────────────────────────────────────

/** Pause execution for a given number of milliseconds */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/** Capitalize the first letter of a string */
export const ucfirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

/** Convert camelCase or PascalCase to snake_case */
export const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`).replace(/^_/, '')

/** Convert snake_case to camelCase */
export const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, l) => l.toUpperCase())

/** Check if a value is a plain object */
export const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

/** Deep clone a plain object or array */
export const deepClone = <T>(val: T): T =>
  JSON.parse(JSON.stringify(val))

/** Pick specific keys from an object */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> =>
  keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Pick<T, K>)

/** Omit specific keys from an object */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach(k => delete result[k])
  return result as Omit<T, K>
}

/** Tap into a value, run a side effect, return the value */
export const tap = <T>(val: T, fn: (v: T) => void): T => {
  fn(val)
  return val
}