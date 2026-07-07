import type { Context, MiddlewareHandler, Next } from "hono";

// ALLOWED_ORIGINS: comma-separated list of allowed origins from env.
// e.g. ALLOWED_ORIGINS=https://dashboard.yourdomain.com,https://yourdomain.com
function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  const extraOrigins = fromEnv
    ? fromEnv.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const builtIn = [
    process.env.DASHBOARD_ORIGIN,
    process.env.LANDING_ORIGIN,
  ].filter(Boolean) as string[];

  const devOrigins =
    process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://localhost:4321"]
      : [];

  return [...new Set([...extraOrigins, ...builtIn, ...devOrigins])];
}

const allowedOrigins = getAllowedOrigins();

export const corsMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  const origin = c.req.header("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin);

  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : (allowedOrigins[0] ?? ""),
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  await next();

  if (isAllowed) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
  }
};
