# Encryption

`@rudderjs/crypt` provides authenticated symmetric encryption for sensitive data — short tokens, encrypted database columns, anything you want to round-trip through your own key. It uses AES-256-CBC with HMAC-SHA256 signing and timing-safe MAC verification, all on Node's built-in `node:crypto`.

## Setup

Install and add the config:

```bash
pnpm add @rudderjs/crypt
```

Generate a 32-byte key:

```ts
import { Crypt } from '@rudderjs/crypt'
console.log(Crypt.generateKey())
// → base64:A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v=
```

Add it to `.env`:

```dotenv
APP_KEY=base64:A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v=
```

```ts
// config/crypt.ts
import { Env } from '@rudderjs/support'
import type { CryptConfig } from '@rudderjs/crypt'

export default {
  key:          Env.get('APP_KEY', ''),
  previousKeys: [],
} satisfies CryptConfig
```

The provider is auto-discovered when `@rudderjs/crypt` is installed. It throws at boot if `APP_KEY` is missing or not exactly 32 bytes.

## Encrypting and decrypting

```ts
import { Crypt } from '@rudderjs/crypt'

// Any value — JSON-serialized internally
const cipher = Crypt.encrypt({ userId: 42, role: 'admin' })
const value  = Crypt.decrypt<{ userId: number; role: string }>(cipher)

// Plain strings — no JSON wrapping
const cipher2 = Crypt.encryptString('sensitive-token')
const plain   = Crypt.decryptString(cipher2)
```

| Method | Description |
|---|---|
| `Crypt.encrypt(value)` | Encrypt any JSON-serializable value |
| `Crypt.decrypt<T>(cipher)` | Decrypt and parse JSON |
| `Crypt.encryptString(value)` | Encrypt a plain string |
| `Crypt.decryptString(cipher)` | Decrypt a plain string |
| `Crypt.generateKey()` | Generate a random 32-byte key |

Each `encrypt()` call generates a fresh random IV, so encrypting the same value twice produces different ciphertexts. Tampering with any byte of the payload fails MAC verification and throws on `decrypt()`.

## Key rotation

To rotate `APP_KEY` without breaking existing encrypted data, move the old key into `previousKeys`:

```ts
// config/crypt.ts
export default {
  key:          Env.get('APP_KEY', ''),       // new key — used to encrypt new data
  previousKeys: [
    Env.get('APP_KEY_OLD', ''),               // tried for decryption only
  ],
} satisfies CryptConfig
```

`Crypt.decrypt()` tries the current key first, then each previous key in order. New data is always encrypted with the current key. Once all old data has been re-encrypted (or expired), drop the entry from `previousKeys`.

## Encrypted columns

`@rudderjs/orm` integrates with crypt for encrypted attribute casts:

```ts
import { Model } from '@rudderjs/orm'

class Customer extends Model {
  static table = 'customer'
  static casts = {
    ssn:        'encrypted',           // string
    metadata:   'encrypted:object',    // JSON object
    flags:      'encrypted:array',     // JSON array
  } as const
}
```

Reads decrypt automatically; writes encrypt before persisting. The encrypted bytes go through the same MAC verification as direct `Crypt.decrypt()` calls — tampered data throws on read.

## When to use encryption vs. hashing

- **Encryption** is reversible. Use it for data you need to read back — encrypted columns, signed cookies, short-lived tokens.
- **Hashing** is one-way. Use it for data you need to *verify* but never read back — passwords, API keys, file fingerprints. See [Hashing](/guide/hashing).

## Pitfalls

- **`APP_KEY` length.** Must be 32 bytes after base64 decoding. The provider validates this at boot — if you see "key must be 32 bytes," regenerate with `Crypt.generateKey()`.
- **Re-encrypting in production.** Don't try to re-encrypt all data in a single migration when rotating keys. Use `previousKeys` for the transition; lazily re-encrypt on next write.
- **Encrypting large blobs.** AES-CBC is fine but slow for multi-megabyte payloads — use it for fields, not files. For files at rest, lean on the storage provider's encryption (S3 SSE, etc.).
