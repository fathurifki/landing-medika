import { Hono } from "hono";
import { db } from "../db";
import { clientContact } from "../db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  // Accept both camelCase (dashboard) and snake_case (landing form)
  phoneNumber: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
});

export const contactRoutes = new Hono();

// Public: submit contact form
contactRoutes.post("/", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  // Normalize: accept both phone_number and phoneNumber from landing
  const phoneNumber = parsed.data.phoneNumber ?? parsed.data.phone_number ?? null;

  const [created] = await db.insert(clientContact).values({
    name: parsed.data.name,
    email: parsed.data.email,
    phoneNumber,
    message: parsed.data.message ?? null,
  }).returning();
  return c.json({ data: created }, 201);
});

// Protected: list all contacts (inbox)
contactRoutes.get("/", authMiddleware, async (c) => {
  const search = c.req.query("search");   // name or email
  const read   = c.req.query("read");     // "true" | "false"
  const limit  = Math.min(200, Math.max(1, Number(c.req.query("limit") || 50)));
  const offset = Math.max(0, Number(c.req.query("offset") || 0));

  const conditions = [];
  if (search) conditions.push(
    // search across name and email — use raw sql OR
    sql`(${clientContact.name} ilike ${"%" + search + "%"} OR ${clientContact.email} ilike ${"%" + search + "%"})`
  );
  if (read === "true")  conditions.push(eq(clientContact.isRead, true));
  if (read === "false") conditions.push(eq(clientContact.isRead, false));

  const where = conditions.length ? and(...conditions) : undefined;

  const [data, countRows] = await Promise.all([
    db.query.clientContact.findMany({ where, orderBy: [desc(clientContact.createdAt)], limit, offset }),
    db.select({ count: sql<number>`count(*)::int` }).from(clientContact).where(where),
  ]);

  return c.json({ data, meta: { total: countRows[0].count, limit, offset } });
});

// Protected: get single contact
contactRoutes.get("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  const item = await db.query.clientContact.findFirst({ where: eq(clientContact.id, id) });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});

// Protected: mark as read
contactRoutes.patch("/:id/read", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  const [updated] = await db
    .update(clientContact)
    .set({ isRead: true })
    .where(eq(clientContact.id, id))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// Protected: delete
contactRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(clientContact).where(eq(clientContact.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
