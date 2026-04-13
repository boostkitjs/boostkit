import { AccessToken } from '../models/AccessToken.js'
import { RefreshToken } from '../models/RefreshToken.js'
import { AuthCode } from '../models/AuthCode.js'
import { DeviceCode } from '../models/DeviceCode.js'

/**
 * Remove expired and revoked tokens from the database.
 * Returns counts of purged records.
 */
export async function purgeTokens(): Promise<{
  accessTokens:  number
  refreshTokens: number
  authCodes:     number
  deviceCodes:   number
}> {
  const now = new Date()

  // Purge expired/revoked access tokens
  const expiredAccess = await AccessToken.query()
    .where('expiresAt', '<', now)
    .orWhere('revoked', true)
    .get() as AccessToken[]
  for (const t of expiredAccess) {
    await AccessToken.delete((t as any).id as string)
  }

  // Purge expired/revoked refresh tokens
  const expiredRefresh = await RefreshToken.query()
    .where('expiresAt', '<', now)
    .orWhere('revoked', true)
    .get() as RefreshToken[]
  for (const t of expiredRefresh) {
    await RefreshToken.delete((t as any).id as string)
  }

  // Purge expired auth codes
  const expiredCodes = await AuthCode.query()
    .where('expiresAt', '<', now)
    .get() as AuthCode[]
  for (const c of expiredCodes) {
    await AuthCode.delete((c as any).id as string)
  }

  // Purge expired device codes
  const expiredDevices = await DeviceCode.query()
    .where('expiresAt', '<', now)
    .get() as DeviceCode[]
  for (const d of expiredDevices) {
    await DeviceCode.delete((d as any).id as string)
  }

  return {
    accessTokens:  expiredAccess.length,
    refreshTokens: expiredRefresh.length,
    authCodes:     expiredCodes.length,
    deviceCodes:   expiredDevices.length,
  }
}
