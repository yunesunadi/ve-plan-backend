import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

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
