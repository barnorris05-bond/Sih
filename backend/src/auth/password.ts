import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a password with scrypt (memory-hard KDF). The encoded format is
 * `scrypt$<saltHex>$<hashHex>` so the scheme can be rotated later without
 * breaking existing records.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [scheme, saltHex, hashHex] = encoded.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const derived = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/**
 * Same scheme and cost parameters as {@link verifyPassword}, but the key derivation runs on libuv's
 * thread pool. scryptSync blocks the event loop for tens of milliseconds per sign-in, stalling every
 * other in-flight request; request handlers must use this variant.
 */
export async function verifyPasswordAsync(password: string, encoded: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = encoded.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
