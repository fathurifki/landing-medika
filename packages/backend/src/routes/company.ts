import { Hono } from "hono";
import { db } from "../db";
import { company } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { ttlCache } from "../middleware/cache";
import { z } from "zod";

const companySchema = z.object({
  logoFooter: z.string().uuid().optional().nullable(),
  logoNavbar: z.string().uuid().optional().nullable(),
  instagram: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emailAddress: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
});

export const companyRoutes = new Hono();
// Company profile is fetched on every single page (navbar + footer) — cache it.
companyRoutes.use("*", ttlCache(60_000));

// Public: get company profile (always returns first row)
companyRoutes.get("/", async (c) => {
  const data = await db.query.company.findFirst();
  return c.json({ data: data ?? null });
});

// Protected: upsert company profile
companyRoutes.put("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = companySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const existing = await db.query.company.findFirst();

  if (existing) {
    const [updated] = await db
      .update(company)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(company.id, existing.id))
      .returning();
    return c.json({ data: updated });
  }

  const [created] = await db.insert(company).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
