import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

/**
 * H-USR-06: minimum password length for every password *creation* path
 * (register / change / reset). Login is deliberately exempt so accounts
 * created under the old 6-char rule are grandfathered.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Only the handful of passwords that top every breach list (and a few
 * product-obvious variants). The 8-char minimum already rejects the short
 * classics like "123456" / "qwerty", so this list is just the 8+ character
 * ones an online guesser tries first. Compared case-insensitively against
 * the trimmed input — deliberately small, not a dictionary.
 */
const COMMON_PASSWORDS = new Set<string>([
  "12345678", "123456789", "1234567890", "12345678910", "987654321",
  "password", "password1", "password123", "passw0rd", "p@ssw0rd",
  "qwerty123", "qwertyuiop", "qwertyui", "1q2w3e4r", "1qaz2wsx", "asdfghjk",
  "11111111", "00000000", "abc12345",
]);

export function isCommonPassword(plain: string): boolean {
  return COMMON_PASSWORDS.has(String(plain).trim().toLowerCase());
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const DUMMY_HASH = "$2b$12$OR2oWUnTWH59vKwarSZ8Zu/hEoXPO40EC.5U47ZQkLeGWfxSujfMm";

export function dummyCompare(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, DUMMY_HASH);
}
