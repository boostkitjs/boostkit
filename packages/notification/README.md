# @forge/notification

Notification channels, notification base class, notifier facade, and provider factory.

## Installation

```bash
pnpm add @forge/notification
```

## Usage

```ts
// bootstrap/providers.ts
import { notifications } from '@forge/notification'

export default [
  notifications(),
]

import { Notification, Notifier } from '@forge/notification'
class WelcomeNotification extends Notification {
  via() { return ['database'] }
  toDatabase() { return { message: 'Welcome' } }
}
await Notifier.send({ id: '1' }, new WelcomeNotification())
```

## API Reference

- `Notifiable`
- `Notification`
- `NotificationChannel`
- `ChannelRegistry`
- `MailChannel`
- `DatabaseChannel`
- `Notifier`
- `notify(notifiables, notification)`
- `notifications()`

## Configuration

This package has no runtime config object.

## Notes

- Built-in channels registered by `notifications()`: `mail`, `database`.
- `mail` channel requires a registered mail adapter; `database` channel requires an ORM adapter.
