import type { Application, ServiceProvider } from '@rudderjs/core'
import { eventsProvider } from '@rudderjs/core'
import { AuthProvider } from '@rudderjs/auth'
import { HashProvider } from '@rudderjs/hash'
import { QueueProvider } from '@rudderjs/queue'
import { MailProvider } from '@rudderjs/mail'
import { CacheProvider } from '@rudderjs/cache'
import { StorageProvider } from '@rudderjs/storage'
import { ScheduleProvider } from '@rudderjs/schedule'
import { NotificationProvider } from '@rudderjs/notification'
import { SessionProvider } from '@rudderjs/session'
import { LocalizationProvider } from '@rudderjs/localization'
import { DatabaseProvider } from '@rudderjs/orm-prisma'
import { BroadcastingProvider } from '@rudderjs/broadcast'
import { LiveProvider } from '@rudderjs/live'
import { AiProvider } from '@rudderjs/ai'
import { BoostProvider } from '@rudderjs/boost'
import { LogProvider } from '@rudderjs/log'
import { TelescopeProvider } from '@rudderjs/telescope'
import { PulseProvider } from '@rudderjs/pulse'
import { HorizonProvider } from '@rudderjs/horizon'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import { UserRegistered } from '../app/Events/UserRegistered.js'
import { SendWelcomeEmailListener } from '../app/Listeners/SendWelcomeEmailListener.js'

export default [
  // ── Infrastructure (order matters) ──────────────────────
  LogProvider,           // boots first — available to all other providers
  DatabaseProvider,      // binds PrismaClient to DI as 'prisma'
  SessionProvider,
  HashProvider,
  CacheProvider,
  AuthProvider,          // requires session + hash

  // ── Features ────────────────────────────────────────────
  QueueProvider,
  eventsProvider({ [UserRegistered.name]: [SendWelcomeEmailListener] }),
  MailProvider,
  StorageProvider,
  LocalizationProvider,
  ScheduleProvider,
  NotificationProvider,
  BroadcastingProvider,
  LiveProvider,
  AiProvider,
  BoostProvider,

  // ── Monitoring ──────────────────────────────────────────
  TelescopeProvider,
  PulseProvider,
  HorizonProvider,

  // ── Application ─────────────────────────────────────────
  AppServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
