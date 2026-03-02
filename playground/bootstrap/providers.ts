import type { Application, ServiceProvider } from '@forge/core'
import { betterAuth } from '@forge/auth-better-auth'
import { queue } from '@forge/queue'
import { events } from '@forge/events'
import { mail } from '@forge/mail'
import { cache } from '@forge/cache'
import { storage } from '@forge/storage'
import { scheduler } from '@forge/schedule'
import { DatabaseServiceProvider } from '../app/Providers/DatabaseServiceProvider.js'
import { AuthServiceProvider } from '../app/Providers/AuthServiceProvider.js'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import { TodoServiceProvider } from '../app/Modules/Todo/TodoServiceProvider.js'
import { UserRegistered } from '../app/Events/UserRegistered.js'
import { SendWelcomeEmailListener } from '../app/Listeners/SendWelcomeEmailListener.js'
import configs from '../config/index.js'

export default [
  // ── Framework Providers ───────────────────────────────────────────────────
  // Adapter-backed services configured via config/. These wire Forge's
  // built-in modules (auth, queue, events, mail, cache, storage, scheduler)
  // to the drivers declared in your config files.
  betterAuth(configs.auth),
  queue(configs.queue),
  events({ [UserRegistered.name]: [SendWelcomeEmailListener] }),
  mail(configs.mail),
  cache(configs.cache),
  storage(configs.storage),
  scheduler(),

  // ── Application Providers ─────────────────────────────────────────────────
  // Your own providers — register bindings, boot services, define routes.
  // DatabaseServiceProvider must remain first: it sets up ModelRegistry before
  // any other provider that depends on the database runs.
  DatabaseServiceProvider,
  AuthServiceProvider,
  AppServiceProvider,
  TodoServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
