# @forge/events

Event dispatcher, listener contract, and provider factory for listener registration.

## Installation

```bash
pnpm add @forge/events
```

## Usage

```ts
// bootstrap/providers.ts
import { events } from '@forge/events'

class UserRegistered {}
class SendWelcome {
  async handle(_event: UserRegistered) {}
}

export default [
  events({ [UserRegistered.name]: [SendWelcome] }),
]
```

## API Reference

- `Listener<T>`
- `EventDispatcher`
- `dispatcher` (global dispatcher)
- `dispatch(event)`
- `ListenMap`
- `events(listenMap)`

## Configuration

This package has no runtime config object.

## Notes

- `EventDispatcher.dispatch()` resolves listeners by `event.constructor.name`.
- Listener handlers are awaited in registration order.
