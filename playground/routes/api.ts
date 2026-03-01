import { router } from '@forge/router'
import { resolve } from '@forge/core'
import { UserService } from '../app/Services/UserService.js'
import { AuthMiddleware } from '../app/Middleware/AuthMiddleware.js'
import { RequestIdMiddleware } from 'app/Middleware/RequestIdMiddleware.js'

// Per-route middleware instance — reused across protected routes
const auth = new AuthMiddleware().toHandler()

router.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// router.get('/id', (_req, res) => res.json({ id: res.header('X-Request-Id') }), [RequestIdMiddleware])  // example of using the RequestIdMiddleware on a specific route

// Public routes — no auth required
router.get('/api/users', async (_req, res) => {
  const users = await resolve<UserService>(UserService).findAll()
  return res.json({ data: users })
}, [auth])  // optional per-route middleware, e.g. for logging or auth

router.get('/api/users/:id', async (req, res) => {
  const user = await resolve<UserService>(UserService).findById(req.params['id']!)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  return res.json({ data: user })
})

// Protected routes — require Authorization: Bearer <token>
router.post('/api/users', async (req, res) => {
  const user = await resolve<UserService>(UserService).create(req.body as { name: string; email: string; role?: string })
  return res.status(201).json({ data: user })
}, [auth])

// Catch-all: any unmatched /api/* route returns 404 instead of falling through to Vike
router.all('/api/*', (_req, res) => res.status(404).json({ message: 'Route not found.' }))
