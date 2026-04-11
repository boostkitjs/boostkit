import { resolve } from 'node:path'
import type { Application, ServiceProvider } from '@rudderjs/core'
import { eventsProvider } from '@rudderjs/core'
import { authProvider } from '@rudderjs/auth'
import { hashProvider } from '@rudderjs/hash'
import { queueProvider } from '@rudderjs/queue'
import { mailProvider } from '@rudderjs/mail'
import { cacheProvider } from '@rudderjs/cache'
import { storageProvider } from '@rudderjs/storage'
import { scheduleProvider } from '@rudderjs/schedule'
import { notificationProvider } from '@rudderjs/notification'
import { sessionProvider } from '@rudderjs/session'
import { localizationProvider } from '@rudderjs/localization'
import { databaseProvider } from '@rudderjs/orm-prisma'
import { broadcastingProvider } from '@rudderjs/broadcast'
import { liveProvider } from '@rudderjs/live'
import { aiProvider } from '@rudderjs/ai'
import { boostProvider } from '@rudderjs/boost'
import { logProvider } from '@rudderjs/log'
import { telescopeProvider } from '@rudderjs/telescope'
import { pulseProvider } from '@rudderjs/pulse'
import { horizonProvider } from '@rudderjs/horizon'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import { UserRegistered } from '../app/Events/UserRegistered.js'
import { SendWelcomeEmailListener } from '../app/Listeners/SendWelcomeEmailListener.js'
import configs from '../config/index.js'

export default [
  // ── Infrastructure (order matters) ──────────────────────
  logProvider(configs.log),           // boots first — available to all other providers
  databaseProvider(configs.database), // binds PrismaClient to DI as 'prisma'
  sessionProvider(configs.session),
  hashProvider(configs.hash),
  cacheProvider(configs.cache),
  authProvider(configs.auth),         // requires session + hash

  // ── Features ────────────────────────────────────────────
  queueProvider(configs.queue),
  eventsProvider({ [UserRegistered.name]: [SendWelcomeEmailListener] }),
  mailProvider(configs.mail),
  storageProvider(configs.storage),
  localizationProvider({
    locale:   configs.app.locale,
    fallback: configs.app.fallback,
    path:     resolve(process.cwd(), 'lang'),
  }),
  scheduleProvider(),
  notificationProvider(),
  broadcastingProvider(),
  liveProvider(configs.live),
  aiProvider(configs.ai),
  boostProvider(),

  // ── Monitoring ──────────────────────────────────────────
  telescopeProvider(configs.telescope),
  pulseProvider(configs.pulse),
  horizonProvider(configs.horizon),

  // ── Application ─────────────────────────────────────────
  AppServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
