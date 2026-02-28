import 'reflect-metadata'
import 'dotenv/config'
import { Application } from '@forge/core'
import { hono } from '@forge/server-hono'
import configs from '../config/index.ts'
import providers from './providers.ts'

export default Application.configure({
  server:    hono(configs.server),
  config:    configs,
  providers,
})
  .withRouting({
    api:      () => import('../routes/api.ts'),
    commands: () => import('../routes/console.ts'),
  })
  .withMiddleware((_m) => {
    // _m.use(new CorsMiddleware().toHandler())
  })
  .withExceptions((_e) => {
    // future: exception reporting and rendering
  })
  .create()
