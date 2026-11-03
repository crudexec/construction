import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function newTotpSecret() {
  let bits = 0, value = 0, output = ''
  for (const byte of randomBytes(20)) {
    value = (value << 8) | byte; bits += 8
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  return output
}
function decodeBase32(secret: string) {
  let bits = 0, value = 0; const bytes = []
  for (const char of secret) {
    const index = alphabet.indexOf(char); if (index < 0) throw new Error('Invalid authenticator secret')
    value = (value << 5) | index; bits += 5
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(bytes)
}
export function totp(secret: string, counter: number) {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest()
  const offset = digest[19] & 15
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
export function matchingCounter(secret: string, code: string, lastCounter: number, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null
  const current = Math.floor(now / 30000)
  for (const counter of [current, current - 1, current + 1]) {
    if (counter > lastCounter && timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, counter)))) return counter
  }
  return null
}
function encryptionKey() {
  const key = process.env.PLATFORM_MFA_ENCRYPTION_KEY
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) throw new Error('PLATFORM_MFA_ENCRYPTION_KEY must be a 32-byte hex key')
  return Buffer.from(key, 'hex')
}
export function seal(secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
}
export function unseal(value: string) {
  const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12))
  decipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
