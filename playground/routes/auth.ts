import { Route } from '@rudderjs/router'
import { view } from '@rudderjs/view'
import { SessionMiddleware } from '@rudderjs/session'
import { CsrfMiddleware } from '@rudderjs/middleware'
import { RequireGuest } from '@rudderjs/auth'
import { AuthController } from '../app/Controllers/AuthController.js'

// Auth routes — Laravel Breeze-style: loaded from routes/api.ts via side-effect
// import so its POST handlers register before api.ts's /api/* catch-all.
//
// Note: `@rudderjs/auth` also ships a `registerAuthRoutes(Route, { … })` helper
// for one-line wiring. We inline the routes here for visibility — the playground
// is a framework demo and should show what's actually happening.

// Session + CSRF + RequireGuest — signed-in users visiting /login get bounced to '/'
const guestOnly = [SessionMiddleware(), CsrfMiddleware(), RequireGuest('/')]

// ── GET view pages ─────────────────────────────────────────
Route.get('/login', async () =>
  view('auth.login', {
    registerUrl:       '/register',
    forgotPasswordUrl: '/forgot-password',
    homeUrl:           '/',
  }),
  guestOnly,
)

Route.get('/register', async () =>
  view('auth.register', {
    loginUrl: '/login',
    homeUrl:  '/',
  }),
  guestOnly,
)

Route.get('/forgot-password', async () =>
  view('auth.forgot-password', {
    loginUrl:         '/login',
    resetPasswordUrl: '/reset-password',
  }),
  guestOnly,
)

Route.get('/reset-password', async () =>
  view('auth.reset-password', {
    loginUrl:          '/login',
    forgotPasswordUrl: '/forgot-password',
  }),
  guestOnly,
)

// ── POST handlers ──────────────────────────────────────────
// /api/auth/sign-{up,in,out}/…, /request-password-reset, /reset-password
Route.registerController(AuthController)
