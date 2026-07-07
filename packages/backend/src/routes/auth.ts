import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { JWTPayload } from "jose";
import { jwtRefreshSecret, jwtSecret } from "../config/env";

type Variables = { user: JWTPayload };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const authRoutes = new Hono<{ Variables: Variables }>();

authRoutes.post("/login", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const accessToken = await new SignJWT({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "15m")
    .setIssuedAt()
    .sign(jwtSecret);

  const refreshToken = await new SignJWT({ sub: String(user.id) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || "7d")
    .setIssuedAt()
    .sign(jwtRefreshSecret);

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

authRoutes.post("/refresh", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { refreshToken } = body as { refreshToken?: string };
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }

  try {
    const { payload } = await jwtVerify(refreshToken, jwtRefreshSecret);
    const userId = Number(payload.sub);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const accessToken = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(process.env.JWT_EXPIRES_IN || "15m")
      .setIssuedAt()
      .sign(jwtSecret);

    return c.json({ accessToken });
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

authRoutes.get("/me", async (c) => {
  const userPayload = c.get("user");
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, Number(userPayload.sub)),
  });

  if (!dbUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const { passwordHash: _pw, ...safeUser } = dbUser;
  return c.json({ data: safeUser });
});
