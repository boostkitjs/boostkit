import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { artisan } from '@boostkit/core'
import { ScheduledTask, schedule, Schedule, scheduler } from './index.js'

describe('Schedule package contract baseline', () => {
  beforeEach(() => {
    artisan.reset()
    ;(schedule as unknown as { _tasks: unknown[] })._tasks.length = 0
  })

  it('Schedule alias points to the same singleton', () => {
    assert.strictEqual(Schedule, schedule)
  })

  it('schedule.call() registers tasks and returns ScheduledTask', () => {
    const task = schedule.call(() => {})
    assert.ok(task instanceof ScheduledTask)
    assert.strictEqual(schedule.getTasks().length, 1)
  })

  it('fluent helpers update cron expression', () => {
    const task = new ScheduledTask(() => {})
    task.everyFiveMinutes().description('sync')

    assert.strictEqual(task.getCron(), '*/5 * * * *')
    assert.strictEqual(task.getDescription(), 'sync')
  })

  it('scheduler() provider registers artisan schedule commands on boot', () => {
    const Provider = scheduler()
    const provider = new Provider({} as never)
    provider.boot?.()

    const names = artisan.getCommands().map((c) => c.name)
    assert.ok(names.includes('schedule:run'))
    assert.ok(names.includes('schedule:work'))
    assert.ok(names.includes('schedule:list'))
  })
})