import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'

import {
  LocalizationRegistry,
  __,
} from './index.js'

describe('interpolation', () => {
  beforeEach(() => LocalizationRegistry.reset())

  it('returns key as-is when namespace not loaded', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    assert.equal(__('messages.missing'), 'messages.missing')
  })

  it('resolves a simple key', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'messages', { greeting: 'Hello!' })
    assert.equal(__('messages.greeting'), 'Hello!')
  })

  it('resolves a nested key', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'messages', { user: { welcome: 'Welcome back!' } })
    assert.equal(__('messages.user.welcome'), 'Welcome back!')
  })

  it('interpolates :placeholder', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'messages', { greeting: 'Hello, :name!' })
    assert.equal(__('messages.greeting', { name: 'John' }), 'Hello, John!')
  })

  it('interpolates multiple placeholders', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'messages', { msg: ':a and :b' })
    assert.equal(__('messages.msg', { a: 'foo', b: 'bar' }), 'foo and bar')
  })

  it('falls back to fallback locale', () => {
    LocalizationRegistry.configure({ locale: 'es', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'messages', { greeting: 'Hello!' })
    assert.equal(__('messages.greeting'), 'Hello!')
  })
})

describe('pluralization', () => {
  beforeEach(() => LocalizationRegistry.reset())

  it('{0} zero case', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'msg', { apples: '{0} no apples|{1} one apple|{n} :count apples' })
    assert.equal(__('msg.apples', 0), 'no apples')
  })

  it('{1} singular case', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'msg', { apples: '{0} no apples|{1} one apple|{n} :count apples' })
    assert.equal(__('msg.apples', 1), 'one apple')
  })

  it('{n} plural case with :count', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'msg', { apples: '{0} no apples|{1} one apple|{n} :count apples' })
    assert.equal(__('msg.apples', 5), '5 apples')
  })

  it('simple two-part plural (singular|plural)', () => {
    LocalizationRegistry.configure({ locale: 'en', fallback: 'en', path: '/tmp' })
    LocalizationRegistry.seed('en', 'msg', { item: 'one item|many items' })
    assert.equal(__('msg.item', 1), 'one item')
    assert.equal(__('msg.item', 2), 'many items')
  })
})
