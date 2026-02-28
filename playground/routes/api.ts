import { router } from '@forge/router'
import { resolve } from '@forge/core'
import { UserService } from '../app/Services/UserService.js'

router.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

router.get('/api/users', async (_req, res) => {
  const users = await resolve<UserService>(UserService).findAll()
  return res.json({ data: users })
})

router.get('/api/users/:id', async (req, res) => {
  const user = await resolve<UserService>(UserService).findById(req.params['id']!)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  return res.json({ data: user })
})

router.post('/api/users', async (req, res) => {
  const user = await resolve<UserService>(UserService).create(req.body as { name: string; email: string; role?: string })
  return res.status(201).json({ data: user })
})

// Catch-all: any unmatched /api/* route returns 404 instead of falling through to Vike
router.all('/api/*', (_req, res) => res.status(404).json({ message: 'Route not found.' }))
