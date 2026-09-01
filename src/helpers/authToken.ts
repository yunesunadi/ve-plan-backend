import jwt from "jsonwebtoken";

const AUTH_TOKEN_TTL = "7d";

export function signAuthToken(user: {
  _id: unknown;
  role?: string | null;
  tokenVersion?: number | null;
}): string {
  return jwt.sign(
    {
      _id: String(user._id),
      role: user.role ?? null,
      tokenVersion: user.tokenVersion ?? 0,
    },
    `${process.env.JWT_SECRET}`,
    { expiresIn: AUTH_TOKEN_TTL }
  );
}
