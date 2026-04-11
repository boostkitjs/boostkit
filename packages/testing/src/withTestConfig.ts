import { ConfigRepository, setConfigRepository, getConfigRepository } from '@rudderjs/core'

/**
 * Run a callback with a temporary config repository, restoring the previous
 * one (or an empty one) on return — even if the callback throws.
 *
 * Required when testing class-based providers that read `config('key')` in
 * their `boot()` method, since the config map is process-global.
 *
 * @example
 * await withTestConfig({ cache: { default: 'memory', stores: { memory: { driver: 'memory' } } } }, async () => {
 *   const provider = new CacheProvider(testApp)
 *   await provider.boot()
 *   // assertions
 * })
 */
export async function withTestConfig<T>(
  testConfig: Record<string, unknown>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const previous = getConfigRepository()
  setConfigRepository(new ConfigRepository(testConfig))
  try {
    return await fn()
  } finally {
    setConfigRepository(previous ?? new ConfigRepository({}))
  }
}
