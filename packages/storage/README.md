# @forge/storage

Storage facade, disk registry, and provider factory with a local filesystem driver.

## Installation

```bash
pnpm add @forge/storage
```

## Usage

```ts
// bootstrap/providers.ts
import { storage } from '@forge/storage'
import configs from '../config/index.js'

export default [
  storage(configs.storage),
]

import { Storage } from '@forge/storage'
await Storage.put('avatars/a.txt', 'hello')
const text = await Storage.text('avatars/a.txt')
```

## API Reference

- `StorageAdapter`, `StorageAdapterProvider`
- `StorageRegistry`
- `Storage`
- `LocalDiskConfig`
- `StorageDiskConfig`, `StorageConfig`
- `storage(config)`

## Configuration

- `StorageConfig`
  - `default`
  - `disks`
- `StorageDiskConfig`
  - `driver`
  - additional driver-specific keys
- `LocalDiskConfig`
  - `driver` (`'local'`)
  - `root`
  - `baseUrl?`

## Notes

- Built-in driver: `local`.
- Plugin driver supported by factory: `s3` (via `@forge/storage-s3`).
- Registers `storage:link` artisan command.
