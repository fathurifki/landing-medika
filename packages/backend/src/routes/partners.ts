import { Hono } from "hono";
import { db } from "../db";
import { partners } from "../db/schema";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { ttlCache } from "../middleware/cache";
import { z } from "zod";

const partnerSchema = z.object({
  name: z.string().min(1),
  logos: z.string().uuid().optional().nullable(),
  partnershipTypes: z.number().int().min(1).max(2).default(1),
});

export const partnerRoutes = new Hono();
partnerRoutes.use("*", ttlCache(60_000));

partnerRoutes.get("/", async (c) => {
  const search = c.req.query("search");
  const type   = c.req.query("type");   // "1" = international, "2" = local
  // Small reference table today, but bound it so it can't grow unbounded.
  const limit  = Math.min(500, Math.max(1, Number(c.req.query("limit") || 200)));
  const offset = Math.max(0, Number(c.req.query("offset") || 0));

  const conditions = [];
  if (search) conditions.push(ilike(partners.name, `%${search}%`));
  if (type)   conditions.push(eq(partners.partnershipTypes, Number(type)));

  const where = conditions.length ? and(...conditions) : undefined;

  const [data, countRows] = await Promise.all([
    db.query.partners.findMany({ where, orderBy: [desc(partners.createdAt)], limit, offset }),
    db.select({ count: sql<number>`count(*)::int` }).from(partners).where(where),
  ]);

  return c.json({ data, meta: { total: countRows[0].count } });
});

partnerRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await db.query.partners.findFirst({ where: eq(partners.id, id) });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});

partnerRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(partners).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});

partnerRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = partnerSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(partners).set({ ...parsed.data, updatedAt: new Date() }).where(eq(partners.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

partnerRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  const [deleted] = await db.delete(partners).where(eq(partners.id, id)).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
