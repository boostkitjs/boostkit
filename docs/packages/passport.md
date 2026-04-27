# Passport

OAuth 2 server for RudderJS. Turns your app into an OAuth 2 provider that issues RS256-signed JWT access tokens, refresh tokens, and personal access tokens. Also ships the `HasApiTokens` mixin for user models and the `RequireBearer` + `scope` middleware for protecting API routes.

## Install

```bash
pnpm add @rudderjs/passport @rudderjs/auth @rudderjs/orm-prisma
```

Publish the Prisma schema and apply it:

```bash
pnpm rudder vendor:publish --tag=passport-schema
pnpm rudder migrate
```

Generate the RSA keypair (required before issuing tokens):

```bash
pnpm rudder passport:keys
# → storage/oauth-private.key + storage/oauth-public.key
```

In production, load keys from env vars instead of the filesystem.

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
  tokensExpireIn:               15 * 24 * 60 * 60 * 1000,   // 15 days
  refreshTokensExpireIn:        30 * 24 * 60 * 60 * 1000,
  personalAccessTokensExpireIn:  6 * 30 * 24 * 60 * 60 * 1000,
} satisfies PassportConfig
```

The provider is auto-discovered. Register the OAuth routes — `/oauth/token`, `/oauth/scopes`, and `/oauth/device/code` are stateless API routes; `/oauth/authorize` and `/oauth/device/approve` need `req.user` and belong on the `web` group:

```ts
// routes/api.ts
import { registerPassportRoutes } from '@rudderjs/passport'
registerPassportRoutes(router)
```

## Protecting API routes

```ts
import { RequireBearer, scope } from '@rudderjs/passport'

router.get ('/api/user',   [RequireBearer()],                 (req) => req.user)
router.get ('/api/posts',  [RequireBearer(), scope('read')],  listPosts)
router.post('/api/posts',  [RequireBearer(), scope('write')], createPost)
```

`RequireBearer()` validates JWT signature, expiration, and revocation. On success, `req.user` is populated. `scope(...)` runs after `RequireBearer()` and reads scopes from request state; `*` on a token grants every scope.

## OAuth grants

Four grants. All exchange via `POST /oauth/token`.

### Authorization Code + PKCE (web, SPA, mobile)

Standard 3-legged flow. PKCE is **required** for public clients; confidential clients may still use it.

```bash
GET /oauth/authorize?response_type=code&client_id=<id>&redirect_uri=...
  &scope=read+write&state=<csrf>&code_challenge=<s256>&code_challenge_method=S256

POST /oauth/token
  grant_type=authorization_code&code=<authcode>&client_id=<id>
  &client_secret=<secret>&redirect_uri=...&code_verifier=<pkce-verifier>
```

### Client Credentials (M2M)

```bash
POST /oauth/token
  grant_type=client_credentials&client_id=<id>&client_secret=<secret>&scope=read+write
```

### Refresh Token

Rotates the pair atomically — reusing an old refresh token returns `invalid_grant`.

```bash
POST /oauth/token
  grant_type=refresh_token&refresh_token=<jwt>&client_id=<id>&client_secret=<secret>
```

### Device Code (CLIs, smart TVs, IoT)

```bash
POST /oauth/device/code  → { device_code, user_code, verification_uri }
POST /oauth/device/approve   user_code=ABCD-1234&approved=true
POST /oauth/token            grant_type=urn:ietf:params:oauth:grant-type:device_code
                             &device_code=<opaque>&client_id=<id>
```

## Personal access tokens

Long-lived tokens — the user generates one from their account page, sees it once, uses it as a bearer token. Enable on the User model with the `HasApiTokens` mixin:

```ts
import { Model } from '@rudderjs/orm'
import { HasApiTokens } from '@rudderjs/passport'

export class User extends HasApiTokens(Model) {
  static table = 'user'
}
```

```ts
const { plainTextToken } = await user.createToken('my-cli', ['read', 'write'])
await user.tokens()              // all tokens for this user
await user.revokeAllTokens()
user.tokenCan('admin')           // current-request token's scope
```

Personal access tokens are issued against an internal `__personal_access__` OAuth client that Passport auto-creates on first use.

## Customization

```ts
import { Passport, OAuthClient } from '@rudderjs/passport'
import { view } from '@rudderjs/view'

// Custom consent screen
Passport.authorizationView((ctx) => view('oauth.authorize', {
  client: ctx.client, scopes: ctx.scopes, redirectUri: ctx.redirectUri, state: ctx.state,
}))

// Custom models
class CustomOAuthClient extends OAuthClient { /* ... */ }
Passport.useClientModel(CustomOAuthClient)
// Also: useTokenModel, useRefreshTokenModel, useAuthCodeModel, useDeviceCodeModel

// Programmatic scopes
Passport.tokensCan({ read: 'Read', write: 'Write', admin: 'Admin' })

// Skip groups, mount custom routes
registerPassportRoutes(router, {
  except: ['authorize', 'scopes'],
  prefix: '/api/oauth',
})
```

Available groups: `authorize`, `token`, `revoke`, `scopes`, `device`.

## CLI

```bash
pnpm rudder passport:keys [--force]                              # generate RSA keypair
pnpm rudder passport:client "App Name"                           # confidential client
pnpm rudder passport:client "SPA" --public                       # public (PKCE required)
pnpm rudder passport:client "Service" --client-credentials       # M2M
pnpm rudder passport:client "TV App" --device                    # device flow
pnpm rudder passport:purge                                       # remove expired/revoked
```

`passport:client` prints the client ID and secret — secrets are SHA-256 hashed on write, so save the printed value immediately.

## Token shape

JWT claims: `jti` (token ID), `sub` (user ID), `aud` (client ID), `scopes`, `iat`, `exp`. Signed RS256 so third parties can verify without calling your server; revocation is DB-checked on each request via `jti`.

| Table | Purpose |
|---|---|
| `oauth_clients` | Registered client apps + hashed secrets |
| `oauth_access_tokens` | Issued tokens (revocation lookup) |
| `oauth_refresh_tokens` | Refresh tokens, 1:1 with access tokens |
| `oauth_auth_codes` | Short-lived authorization codes (10 min, single-use) |
| `oauth_device_codes` | Device flow state |

## Pitfalls

- **Missing RSA keys.** `passport.token()` throws. Run `pnpm rudder passport:keys` or set `PASSPORT_PRIVATE_KEY` / `PASSPORT_PUBLIC_KEY`.
- **`scope(...)` before `RequireBearer()`.** The scope middleware reads request state that `RequireBearer` sets. Order matters.
- **PKCE missing on public clients.** Public clients **must** send `code_challenge` + `code_challenge_method=S256`. Without PKCE → `invalid_request`.
- **Mounting `AuthMiddleware` globally for API.** `@rudderjs/auth` is `web`-only by design. Use `RequireBearer()` per-route on the `api` group.
- **`static table` on custom Models.** It's the Prisma delegate (camelCase, e.g. `oauthClient`), NOT the SQL table (`oauth_clients`).

## Related

- [Authentication](/guide/authentication) — session-based web auth
- [Database](/guide/database) — ORM the OAuth tables build on
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10) — the spec Passport targets
