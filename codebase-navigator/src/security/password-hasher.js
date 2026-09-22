import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const scryptOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const passwordDigest = await deriveKey(password, salt, 64, scryptOptions);
  return ['scrypt', salt, passwordDigest.toString('hex')].join(':');
}

export async function verifyPassword(password, encodedPassword) {
  const [algorithm, salt, hexadecimalDigest] = encodedPassword.split(':');
  if (algorithm !== 'scrypt' || !salt || !hexadecimalDigest) return false;
  const expectedDigest = Buffer.from(hexadecimalDigest, 'hex');
  const actualDigest = await deriveKey(password, salt, 64, scryptOptions);
  return expectedDigest.length === actualDigest.length &&
    timingSafeEqual(expectedDigest, actualDigest);
}
