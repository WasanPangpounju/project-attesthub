import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error("ENCRYPTION_KEY environment variable is not set")
  if (!/^[0-9a-fA-F]{64}$/.test(raw))
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
  return Buffer.from(raw, "hex")
}

export function encryptPassword(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return iv.toString("hex") + ":" + encrypted.toString("hex")
}

export function decryptPassword(encrypted: string): string {
  const key = getKey()
  const [ivHex, encHex] = encrypted.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const encBuf = Buffer.from(encHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString("utf8")
}
