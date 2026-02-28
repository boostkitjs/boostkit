import 'reflect-metadata'
import { Application } from '@forge/core'
import { Router, Controller, Get, Post } from '@forge/router'
import { LoggerMiddleware, CorsMiddleware } from '@forge/middleware'
import { hono } from '@forge/server-hono'
import { z } from 'zod'
import { validate } from '@forge/validation'

// ─── Controllers ───────────────────────────────────────────

@Controller('/users')
class UserController {
  @Get('/')
  index() {
    return { users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]}
  }

  @Get('/:id')
  show({ params }: any) {
    return { user: { id: params.id, name: 'Alice' } }
  }

  @Post('/')
  async store(req: any, res: any) {
    const data = await validate(
      z.object({
        name:  z.string().min(2),
        email: z.string().email(),
      }),
      req
    )
    return res.status(201).json({ user: data })
  }
}

@Controller('/health')
class HealthController {
  @Get('/')
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}

// ─── Bootstrap ─────────────────────────────────────────────

const app    = Application.create({ name: 'Forge Playground', env: 'development', debug: true })
const server = hono().create()
const router = new Router()

// Global middleware
router.use(new LoggerMiddleware().toHandler())
router.use(new CorsMiddleware({ origin: '*' }).toHandler())

// Register controllers
router.registerController(UserController)
router.registerController(HealthController)

// Mount routes onto server
router.mount(server)

// Start
await app.bootstrap()
server.listen(3000, () => {
  console.log('🔥 Forge Playground running on http://localhost:3000')
  console.log('')
  console.log('Routes:')
  for (const route of router.list()) {
    console.log(`  ${route.method.padEnd(7)} ${route.path}`)
  }
})