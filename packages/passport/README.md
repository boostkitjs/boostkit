# @rudderjs/passport

OAuth 2 server for RudderJS — the Laravel Passport equivalent. Turns your app into an OAuth 2 provider that issues JWT-signed access tokens, refresh tokens, and personal access tokens.

## Features

- **Four OAuth 2 grants** — authorization code (with PKCE), client credentials, refresh token, device code
- **Personal access tokens** — Laravel-style `user.createToken()` via the `HasApiTokens` mixin
- **JWT with RS256** — signed with an RSA private key; third parties can verify tokens without calling your server
- **Auto-registered routes** — `/oauth/authorize`, `/oauth/token`, `/oauth/scopes`, `/oauth/device/*`, plus token revocation
- **Bearer middleware** — `RequireBearer()` + `scope('read', 'write')` for per-route API auth
- **Customization hooks** — swap any model, wire a custom consent screen, disable routes selectively

## Installation

```bash
pnpm add @rudderjs/passport @rudderjs/auth @rudderjs/orm-prisma
```

Add the Prisma schema to your playground's multi-file schema setup:

```prisma
// prisma/schema/passport.prisma
// Copy the models from @rudderjs/passport/schema/passport.prisma
```

Then regenerate the client and push the schema:

```bash
pnpm exec prisma generate
pnpm exec prisma db push
```

Generate RSA keys (required before issuing tokens):

```bash
pnpm rudder passport:keys
```

Keys land in `storage/oauth-{private,public}.key`. In production, load them from env vars instead — see **Configuration** below.

## Setup

```ts
// config/passport.ts
import type { PassportConfig } from '@rudderjs/passport'

export default {
  scopes: {
    read:  'Read access',
    write: 'Write access',
    admin: 'Full administrative access',
  },
  tokensExpireIn:              15 * 24 * 60 * 60 * 1000,  // 15 days
  refreshTokensExpireIn:       30 * 24 * 60 * 60 * 1000,  // 30 days
  personalAccessTokensExpireIn: 6 * 30 * 24 * 60 * 60 * 1000, // ~6 months
} satisfies PassportConfig
```

Add the provider — auto-discovery picks it up automatically after `pnpm rudder providers:discover`. Or register explicitly:

```ts
// bootstrap/providers.ts
import { PassportProvider } from '@rudderjs/passport'

export default [
  // ...auth, session, orm first
  PassportProvider,
]
```

Register the OAuth routes. API routes are the right home because they're stateless — but the consent + device-approve endpoints both need a signed-in user, so if you use those, mount them on the `web` group:

```ts
// routes/api.ts
import { registerPassportRoutes } from '@rudderjs/passport'

export default (router) => {
  registerPassportRoutes(router)
}
```

## Protecting API Routes

`RequireBearer()` validates the JWT signature, checks expiration, and confirms the token hasn't been revoked. `scope(...)` enforces OAuth scopes on the token.

```ts
import { RequireBearer, scope } from '@rudderjs/passport'

router.get('/api/user',    [RequireBearer()],                 (req) => req.user)
router.get('/api/posts',   [RequireBearer(), scope('read')],  listPosts)
router.post('/api/posts',  [RequireBearer(), scope('write')], createPost)
router.post('/api/admin',  [RequireBearer(), scope('admin')], adminAction)
```

A valid request attaches the resolved user to `req.user`, so handlers read it the same way they would under session auth.

The wildcard scope `*` grants everything — useful for personal access tokens issued without a specific scope restriction.

## OAuth Flows

### Authorization Code + PKCE (web apps, SPAs, mobile)

Standard 3-legged flow. Client redirects the user to `/oauth/authorize`, user approves, client exchanges the auth code at `/oauth/token`.

```bash
# 1. User is redirected to:
GET /oauth/authorize
  ?response_type=code
  &client_id=<id>
  &redirect_uri=https://app.example.com/callback
  &scope=read+write
  &state=<csrf>
  &code_challenge=<s256-hash>
  &code_challenge_method=S256

# 2. After user approves (POST /oauth/authorize), they're redirected back with:
#    https://app.example.com/callback?code=<authcode>&state=<csrf>

# 3. App exchanges the code for tokens:
POST /oauth/token
{
  "grant_type":    "authorization_code",
  "code":          "<authcode>",
  "client_id":     "<id>",
  "client_secret": "<secret>",        // omit for public clients
  "redirect_uri":  "https://app.example.com/callback",
  "code_verifier": "<pkce-verifier>"
}
```

**PKCE is required for public clients.** Confidential clients may skip it but are still allowed to use it.

### Client Credentials (machine-to-machine)

For service-to-service auth with no end-user. Only confidential clients.

```bash
POST /oauth/token
{
  "grant_type":    "client_credentials",
  "client_id":     "<id>",
  "client_secret": "<secret>",
  "scope":         "read write"
}
```

### Refresh Token

Rotates the access/refresh token pair. The old pair is revoked atomically — reusing a refresh token fails.

```bash
POST /oauth/token
{
  "grant_type":    "refresh_token",
  "refresh_token": "<jwt>",
  "client_id":     "<id>",
  "client_secret": "<secret>"
}
```

### Device Code (CLIs, smart TVs, IoT)

Device requests a short user code, user approves it in a browser, device polls the token endpoint.

```bash
# 1. Device requests a code
POST /oauth/device/code
{ "client_id": "<id>", "scope": "read" }

# Response:
{
  "device_code":      "<long-opaque>",
  "user_code":        "ABCD-1234",
  "verification_uri": "https://app.example.com/oauth/device",
  "expires_in":       600,
  "interval":         5
}

# 2. User visits verification_uri, enters user_code, approves:
POST /oauth/device/approve  (web — needs signed-in user)
{ "user_code": "ABCD-1234", "approved": true }

# 3. Device polls:
POST /oauth/token
{
  "grant_type":  "urn:ietf:params:oauth:grant-type:device_code",
  "device_code": "<long-opaque>",
  "client_id":   "<id>"
}
# Returns 400 authorization_pending / 429 slow_down until approved,
# then 200 with the token pair.
```

## Personal Access Tokens

For long-lived API tokens — like GitHub personal access tokens. The user generates a token from their account UI; the token is shown once and never re-displayed.

Enable on your User model with the `HasApiTokens` mixin:

```ts
// app/Models/User.ts
import { Model } from '@rudderjs/orm'
import { HasApiTokens } from '@rudderjs/passport'

export class User extends HasApiTokens(Model) {
  static table = 'user'
  // ...
}
```

Then issue and manage tokens:

```ts
const user = await User.find(userId)

// Create — returns the JWT once + the persisted record
const { plainTextToken, token } = await user.createToken('my-cli', ['read', 'write'])
// plainTextToken: 'eyJ...' — show this to the user ONCE

// List
const tokens = await user.tokens()

// Revoke all
const count = await user.revokeAllTokens()

// Check current request token's scope (inside a BearerMiddleware-protected route)
if (user.tokenCan('admin')) { ... }
```

Personal access tokens are issued against an internal `__personal_access__` OAuth client that Passport auto-creates on first use.

## Customization Hooks

Every surface — models, consent screen, route registration — can be swapped.

### Custom Models

Extend any Passport model to add columns or override behavior, then register:

```ts
import { Passport, OAuthClient } from '@rudderjs/passport'

class CustomOAuthClient extends OAuthClient {
  static table = 'myOAuthClient'
  // ...extra columns, overrides
}

// In a provider's boot()
Passport.useClientModel(CustomOAuthClient)
```

Same pattern for `useTokenModel`, `useRefreshTokenModel`, `useAuthCodeModel`, `useDeviceCodeModel`.

### Custom Consent Screen

`GET /oauth/authorize` returns JSON by default. Wire a `@rudderjs/view` page for real consent UX:

```ts
import { Passport } from '@rudderjs/passport'
import { view } from '@rudderjs/view'

// In a provider's boot()
Passport.authorizationView((ctx) => {
  return view('oauth.authorize', {
    client:       ctx.client,
    scopes:       ctx.scopes,
    redirectUri:  ctx.redirectUri,
    state:        ctx.state,
    codeChallenge: ctx.codeChallenge,
  })
})
```

The view posts back to `POST /oauth/authorize` with the same params + the current user's session.

### Selective Route Registration

Skip route groups you want to handle yourself:

```ts
registerPassportRoutes(router, {
  except: ['authorize', 'scopes'], // mount your own consent + scopes endpoints
  prefix: '/api/oauth',            // default is '/oauth'
})
```

Available groups: `authorize`, `token`, `revoke`, `scopes`, `device`.

To disable route registration entirely, call `Passport.ignoreRoutes()` before the provider boots. `registerPassportRoutes()` becomes a no-op.

## Configuration

### Key Management

Three ways to provide the RSA keypair, in precedence order:

1. **Env vars** (recommended for production):
   ```ts
   // config/passport.ts
   export default {
     privateKey: process.env.PASSPORT_PRIVATE_KEY,
     publicKey:  process.env.PASSPORT_PUBLIC_KEY,
   }
   ```

2. **Custom key directory**:
   ```ts
   export default { keyPath: 'secure/keys' }
   // Reads secure/keys/oauth-private.key + oauth-public.key
   ```

3. **Default** — files in `storage/oauth-{private,public}.key`, generated by `rudder passport:keys`.

### Token Lifetimes

All in milliseconds:

| Option | Default | Purpose |
|---|---|---|
| `tokensExpireIn` | 15 days | Access token lifetime |
| `refreshTokensExpireIn` | 30 days | Refresh token lifetime |
| `personalAccessTokensExpireIn` | ~6 months | Personal access token lifetime |

## CLI Commands

```bash
# Generate an RSA keypair (refuses to overwrite without --force)
pnpm rudder passport:keys [--force]

# Create an OAuth client
pnpm rudder passport:client "My App"
pnpm rudder passport:client "SPA" --public                  # public (PKCE-required)
pnpm rudder passport:client "Service" --client-credentials   # M2M
pnpm rudder passport:client "TV App" --device                # device code
pnpm rudder passport:client "__personal_access__" --personal # personal token issuer

# Remove expired + revoked tokens, auth codes, device codes
pnpm rudder passport:purge
```

`passport:client` prints the client ID and (for confidential clients) the secret. Secrets are SHA-256 hashed on write — store the printed secret immediately; it is not recoverable.

## Architecture

**Tables** — five in `schema/passport.prisma`:

| Table | Purpose |
|---|---|
| `oauth_clients` | Registered client apps + their secrets |
| `oauth_access_tokens` | Issued access tokens (for revocation lookup) |
| `oauth_refresh_tokens` | Refresh tokens, linked 1:1 to an access token |
| `oauth_auth_codes` | Short-lived authorization codes (single-use, 10 min) |
| `oauth_device_codes` | Device authorization flow state |

**Token shape** — JWTs carry `jti` (token ID), `sub` (user ID), `aud` (client ID), `scopes`, `iat`, `exp`. Revocation is checked against the DB row keyed by `jti`.

**Provider order** — `PassportProvider` boots at the `infrastructure` stage and depends on `@rudderjs/auth` + `@rudderjs/orm-prisma`. Auto-discovery resolves the order automatically.

## Pitfalls

- **Missing keys** — `pnpm rudder passport:keys` before issuing any token, or set `PASSPORT_PRIVATE_KEY` + `PASSPORT_PUBLIC_KEY`.
- **Schema not migrated** — copy `schema/passport.prisma` into your project's Prisma schema and run `prisma db push`.
- **Bearer middleware on web routes** — use it on `api.ts` routes. Web routes have session-based auth already via `AuthMiddleware` on the `web` group.
- **PKCE on public clients** — public clients *must* send `code_challenge` + `code_challenge_method=S256`. No PKCE = `invalid_request`.
- **Refresh token replay** — reusing an old refresh token returns `invalid_grant`; the rotation already revoked it.
- **Stale personal-access client cache** — `resetPersonalAccessClient()` is test-only. Don't call it at runtime.
- **Prisma delegate vs `@@map`** — if you override a model, `static table` must be the Prisma delegate name (camelCase), not the `@@map`'d SQL name. `oauthClient`, not `oauth_clients`.
- **Scope middleware ordering** — `scope(...)` must run after `RequireBearer()` or `BearerMiddleware()`. It reads token scopes from the request state set by the bearer middleware.

## Related

- [`@rudderjs/auth`](../auth) — session-based web auth (login, register, password reset)
- [`@rudderjs/orm`](../orm) — ORM for the OAuth models
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10) — the spec Passport targets
