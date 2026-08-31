const REQUIRED_IN_PRODUCTION = [
  "DB_URL",
  "JWT_SECRET",
  "FRONTEND_URL",
  "CORS_ORIGIN",
  "PRIVATE_KEY_PATH",
];

export function assertEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required env in production: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.env.CORS_ORIGIN === "*") {
    console.error("CORS_ORIGIN must not be '*' in production.");
    process.exit(1);
  }
}

export function corsOrigin(): string | string[] {
  const configured = process.env.CORS_ORIGIN;
  if (configured) return configured.split(",").map((o) => o.trim());
  return "*";
}
