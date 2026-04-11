import type { Application, ServiceProvider } from '@rudderjs/core'
import { authProvider } from '@rudderjs/auth'
import { eventsProvider } from '@rudderjs/core'
import { queueProvider } from '@rudderjs/queue'
import { mailProvider } from '@rudderjs/mail'
import { notificationProvider } from '@rudderjs/notification'
import { cacheProvider } from '@rudderjs/cache'
import { storageProvider } from '@rudderjs/storage'
import { scheduleProvider } from '@rudderjs/schedule'
import { sessionProvider } from '@rudderjs/session'
import { databaseProvider } from '@rudderjs/orm-prisma'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import configs from '../config/index.js'

export default [
  databaseProvider(configs.database),  // boots first — binds PrismaClient to DI as 'prisma'
  authProvider(configs.auth),          // auto-discovers 'prisma' from DI
  eventsProvider({}),
  queueProvider(configs.queue),
  mailProvider(configs.mail),
  notificationProvider(),
  cacheProvider(configs.cache),
  storageProvider(configs.storage),
  sessionProvider(configs.session),
  scheduleProvider(),
  AppServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
