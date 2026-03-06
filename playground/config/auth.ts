import { Env } from '@boostkit/core'
import type { BetterAuthConfig } from '@boostkit/auth'
import { dispatch } from '@boostkit/events'
import { UserRegistered } from '../app/Events/UserRegistered.js'

export default {
  secret:           Env.get('AUTH_SECRET', 'please-set-AUTH_SECRET-min-32-chars!!'),
  baseUrl:          Env.get('APP_URL', 'http://localhost:3000'),
  emailAndPassword: { enabled: true },

  onUserCreated: async (user) => {
    await dispatch(new UserRegistered(user.id, user.name, user.email))
  },
} satisfies BetterAuthConfig
