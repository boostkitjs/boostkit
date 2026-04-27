# Localization

`@rudderjs/localization` translates strings against JSON language files. It supports named interpolation, plural rules, fallback locales, and request-scoped locale switching via AsyncLocalStorage — so a Spanish-speaking user's request renders Spanish strings without leaking that locale to other in-flight requests.

## Setup

```bash
pnpm add @rudderjs/localization
```

Create JSON language files:

```
lang/
├── en/
│   └── messages.json
├── es/
│   └── messages.json
└── ar/
    └── messages.json
```

```json
// lang/en/messages.json
{
  "welcome":  "Welcome to :app!",
  "greeting": "Hello, :name!",
  "items":    "{0} no items|{1} one item|{n} :count items"
}
```

```ts
// config/localization.ts
import { resolve } from 'node:path'
import { Env } from '@rudderjs/support'

export default {
  locale:   Env.get('APP_LOCALE', 'en'),
  fallback: 'en',
  path:     resolve(process.cwd(), 'lang'),
}
```

The provider is auto-discovered.

## Translating

```ts
import { trans } from '@rudderjs/localization'

await trans('messages.welcome', { app: 'RudderJS' })   // 'Welcome to RudderJS!'
await trans('messages.greeting', { name: 'Alice' })    // 'Hello, Alice!'
await trans('messages.items', 3)                        // '3 items'
```

For sync lookups (cache-only, returns the key on miss), use `__()`:

```ts
import { __ } from '@rudderjs/localization'

__('messages.greeting', { name: 'Alice' })
```

> Always use `trans()` inside Vike `+data.ts` files — `__()` is sync and won't load a namespace that hasn't been touched yet. Inside route handlers and middleware, `__()` is fine after the namespace has been loaded once.

## Pluralization

Three forms are supported, in increasing complexity:

```json
{
  "apple_count": "one apple|many apples",
  "items":       "{0} no items|{1} one item|{n} :count items",
  "shoes":       "{0} no shoes|{1} one shoe|{2,4} a few shoes|{n} :count shoes"
}
```

```ts
await trans('messages.shoes', 0)   // 'no shoes'
await trans('messages.shoes', 1)   // 'one shoe'
await trans('messages.shoes', 3)   // 'a few shoes' — matches {2,4}
await trans('messages.shoes', 12)  // '12 shoes'
```

`{n}` is the fallback for any count not matched by a more specific rule. Counts pass as the second argument; if you need both a count and named placeholders, pass `{ count: 3, name: 'Alice' }`.

## Per-request locale

The locale is per-request. Set it from middleware, a route handler, or a sign-in flow:

```ts
import { setLocale, locale } from '@rudderjs/localization'

const detectLocale: MiddlewareHandler = async (req, _res, next) => {
  const lang = req.headers['accept-language']?.split(',')[0] ?? 'en'
  setLocale(lang)            // request-scoped via ALS
  await next()
}

console.log(locale())        // current locale
```

Calling `setLocale('es')` inside a request changes the locale for the rest of that request only — concurrent requests are unaffected. See [Request Lifecycle](/guide/lifecycle) for the AsyncLocalStorage model.

## Multiple namespaces

Each filename in `lang/<locale>/` is a namespace. Reference keys with `namespace.key`:

```
lang/en/auth.json       → trans('auth.login.success')
lang/en/messages.json   → trans('messages.welcome')
lang/en/validation.json → trans('validation.required')
```

The framework loads namespaces lazily on first access — `trans('messages.welcome')` reads `messages.json` once and caches it.

## Validation messages

If `lang/<locale>/validation.json` exists, `@rudderjs/core`'s validator uses it for error messages:

```json
{
  "required": ":field is required.",
  "email":    ":field must be a valid email address."
}
```

The validator passes `:field` automatically. See [Validation](/guide/validation).

## Pitfalls

- **`__()` in `+data.ts`.** Sync lookup miss returns the key, not the translation. Use `trans()` (async) so the namespace can load on first access.
- **Locale leaking across requests.** Don't store the locale on a singleton service. `setLocale()` writes to AsyncLocalStorage — that's the only safe path.
- **Plural matching order.** Specific ranges (`{2,4}`) must come before `{n}` — the matcher takes the first matching segment.
