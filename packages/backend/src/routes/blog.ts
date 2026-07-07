import { Hono } from "hono";
import { db } from "../db";
import { blogs } from "../db/schema";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";

const blogSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  banner: z.string().uuid().optional().nullable(),
  status: z.enum(["published", "draft"]).default("draft"),
  slugs: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export const blogRoutes = new Hono();

// Public: list blogs
blogRoutes.get("/", async (c) => {
  const page  = Math.max(1, Number(c.req.query("page")  || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 20)));
  const offset = (page - 1) * limit;
  const status = c.req.query("status");      // "published" | "draft"
  const search = c.req.query("search");      // free-text on title

  const conditions = [];
  if (status) conditions.push(eq(blogs.status, status));
  if (search)  conditions.push(ilike(blogs.title, `%${search}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [data, countRows] = await Promise.all([
    db.query.blogs.findMany({ where, orderBy: [desc(blogs.dateCreated)], limit, offset }),
    db.select({ count: sql<number>`count(*)::int` }).from(blogs).where(where),
  ]);

  return c.json({ data, meta: { total: countRows[0].count, page, limit } });
});

// Public: get single blog
blogRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const blog = await db.query.blogs.findFirst({
    where: eq(blogs.id, id),
  });

  if (!blog) return c.json({ error: "Not found" }, 404);
  return c.json({ data: blog });
});

// Protected: create blog
blogRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = blogSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [created] = await db.insert(blogs).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});

// Protected: update blog
blogRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = blogSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(blogs)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(blogs.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// Protected: delete blog
blogRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  const [deleted] = await db.delete(blogs).where(eq(blogs.id, id)).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
