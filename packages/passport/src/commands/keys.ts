import { Passport } from '../Passport.js'

/**
 * Generate RSA keypair for JWT signing.
 * Writes to storage/oauth-private.key and storage/oauth-public.key.
 */
export async function generateKeys(opts: { force?: boolean } = {}): Promise<{ privatePath: string; publicPath: string }> {
  const { generateKeyPairSync } = await import('node:crypto')
  const { writeFile, mkdir } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')

  const keyDir = join(process.cwd(), Passport.keyPath())
  const privatePath = join(keyDir, 'oauth-private.key')
  const publicPath  = join(keyDir, 'oauth-public.key')

  if (!opts.force && existsSync(privatePath)) {
    throw new Error(`Keys already exist at ${privatePath}. Use --force to overwrite.`)
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  await mkdir(keyDir, { recursive: true })
  await writeFile(privatePath, privateKey, { mode: 0o600 })
  await writeFile(publicPath, publicKey, { mode: 0o644 })

  return { privatePath, publicPath }
}
