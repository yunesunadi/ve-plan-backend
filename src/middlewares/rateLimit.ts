import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const emailKey = (req: any) => {
  const ip = ipKeyGenerator(req.ip || "unknown");
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
  return email ? `${ip}:${email}` : ip;
};

const message = {
  status: "error",
  message: "Too many attempts. Please wait a few minutes and try again.",
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: emailKey,
  message,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: emailKey,
  message,
});
