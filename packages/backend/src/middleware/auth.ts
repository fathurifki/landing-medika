import { Context, Next } from "hono";
import { jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { jwtSecret } from "../config/env";

export async function authMiddleware(c: Context<{ Variables: { user: JWTPayload } }>, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: missing token" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Unauthorized: invalid or expired token" }, 401);
  }
}
