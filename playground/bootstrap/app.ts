import 'reflect-metadata'
import 'dotenv/config'
import { Application } from '@boostkit/core'
import { hono } from '@boostkit/server-hono'
import { RateLimit } from '@boostkit/middleware'
import { requestIdMiddleware } from '../app/Middleware/RequestIdMiddleware.ts'
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
    // Global middlewares
    m.use(RateLimit.perMinute(60))
    m.use(requestIdMiddleware)
  })
  .withExceptions((_e) => {
    // future: exception reporting and rendering
  })
  .create()
