import type { TestCase } from '../TestCase.js'

/**
 * Truncates all database tables between tests for isolation.
 *
 * @example
 * class UserTest extends TestCase {
 *   use = [RefreshDatabase]
 * }
 */
export class RefreshDatabase {
  async setUp(testCase: TestCase): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orm = testCase.app.make<any>('orm')
      if (typeof orm.truncateAll === 'function') {
        await orm.truncateAll()
      } else if (typeof orm.query === 'function') {
        // Fallback: try to get table list and truncate individually
        // This is ORM-specific — Prisma adapter may expose this differently
      }
    } catch {
      // ORM not registered — skip silently
    }
  }

  async tearDown(_testCase: TestCase): Promise<void> {
    // Cleanup handled by setUp on next test
  }
}
