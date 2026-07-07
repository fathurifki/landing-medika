import { Hono } from "hono";
import { db } from "../db";
import { events, eventTypes } from "../db/schema";
import { eq, desc, ilike, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { ttlCache } from "../middleware/cache";
import { z } from "zod";

// ── Event Types ───────────────────────────────────────────────────────────────

const eventTypeSchema = z.object({
  slug: z.string().optional().nullable(),
  eventName: z.string().min(1),
  nameEvents: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  eventImage: z.string().uuid().optional().nullable(),
});

export const eventTypeRoutes = new Hono();
eventTypeRoutes.use("*", ttlCache(60_000));

eventTypeRoutes.get("/", async (c) => {
  const search = c.req.query("search");
  const where  = search ? ilike(eventTypes.eventName, `%${search}%`) : undefined;
  const limit  = Math.min(500, Math.max(1, Number(c.req.query("limit") || 200)));
  const offset = Math.max(0, Number(c.req.query("offset") || 0));

  const [data, countRows] = await Promise.all([
    db.query.eventTypes.findMany({ where, orderBy: [desc(eventTypes.createdAt)], limit, offset }),
    db.select({ count: sql<number>`count(*)::int` }).from(eventTypes).where(where),
  ]);

  return c.json({ data, meta: { total: countRows[0].count } });
});
eventTypeRoutes.get("/:id", async (c) => {
  const item = await db.query.eventTypes.findFirst({ where: eq(eventTypes.id, Number(c.req.param("id"))) });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});
eventTypeRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = eventTypeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(eventTypes).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
eventTypeRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = eventTypeSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(eventTypes).set({ ...parsed.data, updatedAt: new Date() }).where(eq(eventTypes.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
eventTypeRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(eventTypes).where(eq(eventTypes.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});

// ── Events ────────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  eventImage: z.string().uuid().optional().nullable(),
  medicalEvents: z.number().int().optional().nullable(),
});

export const eventRoutes = new Hono();
eventRoutes.use("*", ttlCache(60_000));

eventRoutes.get("/", async (c) => {
  const filterStr = c.req.query("filter");
  let filterParam: Record<string, unknown> = {};
  if (filterStr) {
    try { filterParam = JSON.parse(filterStr); } catch { /* ignore */ }
  }
  const limit = Math.min(500, Math.max(1, Number(c.req.query("limit") || 200)));

  let data;
  if (filterParam.medical_events && typeof filterParam.medical_events === "object") {
    const f = filterParam.medical_events as { _eq?: number };
    data = await db.query.events.findMany({
      where: f._eq !== undefined ? eq(events.medicalEvents, f._eq) : undefined,
      orderBy: [desc(events.createdAt)],
      limit,
    });
  } else {
    data = await db.query.events.findMany({ orderBy: [desc(events.createdAt)], limit });
  }

  return c.json({ data });
});
eventRoutes.get("/:id", async (c) => {
  const item = await db.query.events.findFirst({ where: eq(events.id, Number(c.req.param("id"))) });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});
eventRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(events).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
eventRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(events).where(eq(events.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
