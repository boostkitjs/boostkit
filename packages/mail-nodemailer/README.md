# @forge/mail-nodemailer

Nodemailer SMTP adapter provider for `@forge/mail`.

## Installation

```bash
pnpm add @forge/mail-nodemailer
```

## Usage

```ts
import { nodemailer } from '@forge/mail-nodemailer'

const provider = nodemailer(
  {
    driver: 'smtp',
    host: 'smtp.example.com',
    port: 587,
    username: 'user',
    password: 'pass',
    encryption: 'tls',
  },
  { address: 'noreply@example.com', name: 'Forge' }
)
```

## API Reference

- `NodemailerConfig`
- `nodemailer(config, from)` → `MailAdapterProvider`

## Configuration

- `NodemailerConfig`
  - `driver`
  - `host`, `port`
  - `username?`, `password?`
  - `encryption?` (`'tls' | 'ssl' | 'none'`)

## Notes

- Uses `nodemailer`.
- The exported function name is `nodemailer` (used by `@forge/mail` dynamic loading).
