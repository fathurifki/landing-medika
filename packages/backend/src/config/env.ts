import * as dotenv from "dotenv";
import path from "path";

// In production, env vars are injected by Docker. In development, load the
// monorepo root .env once so every backend module reads the same values.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../../../.env") });
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readOptionalEnv(name: string): string | undefined {
  return readEnv(name);
}

export const databaseUrl = requireEnv("DATABASE_URL");
export const jwtSecret = new TextEncoder().encode(requireEnv("JWT_SECRET"));
export const jwtRefreshSecret = new TextEncoder().encode(
  requireEnv("JWT_REFRESH_SECRET")
);
