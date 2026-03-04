import 'reflect-metadata'
import 'dotenv/config'
import { Application } from '@boostkit/core'
import { hono } from '@boostkit/server-hono'
import { RateLimit, CsrfMiddleware } from '@boostkit/middleware'
import { RequestIdMiddleware } from '../app/Middleware/RequestIdMiddleware.ts'
import configs from '../config/index.ts'
import providers from './providers.ts'

export default Application.configure({
  server:    hono(configs.server),
  config:    configs,
  providers,
})
  .withRouting({
    web:      () => import('../routes/web.ts'),
    api:      () => import('../routes/api.ts'),
    commands: () => import('../routes/console.ts'),
  })
  .withMiddleware((m) => {
    // Global rate limit — cache-backed, persists across restarts
    m.use(RateLimit.perMinute(60).toHandler())
    m.use(new RequestIdMiddleware().toHandler())
    // CSRF — sets cookie on GET, validates token on mutations
    // Excludes auth routes (better-auth has its own CSRF) and webhooks
    m.use(new CsrfMiddleware({ exclude: ['/api/auth/*'] }).toHandler())
  })
  .withExceptions((_e) => {
    // future: exception reporting and rendering
  })
  .create()
