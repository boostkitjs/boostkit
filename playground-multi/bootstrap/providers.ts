import type { Application, ServiceProvider } from '@rudderjs/core'
import { AuthProvider } from '@rudderjs/auth'
import { eventsProvider } from '@rudderjs/core'
import { QueueProvider } from '@rudderjs/queue'
import { MailProvider } from '@rudderjs/mail'
import { NotificationProvider } from '@rudderjs/notification'
import { CacheProvider } from '@rudderjs/cache'
import { StorageProvider } from '@rudderjs/storage'
import { ScheduleProvider } from '@rudderjs/schedule'
import { SessionProvider } from '@rudderjs/session'
import { DatabaseProvider } from '@rudderjs/orm-prisma'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'

export default [
  DatabaseProvider,      // boots first — binds PrismaClient to DI as 'prisma'
  AuthProvider,          // auto-discovers 'prisma' from DI
  eventsProvider({}),
  QueueProvider,
  MailProvider,
  NotificationProvider,
  CacheProvider,
  StorageProvider,
  SessionProvider,
  ScheduleProvider,
  AppServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
