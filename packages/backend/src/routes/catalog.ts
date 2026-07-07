import { Hono } from "hono";
import { db } from "../db";
import { catalog } from "../db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import { sanitizeRichTextFields } from "../lib/sanitize";

const catalogSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["published", "draft"]).default("draft"),
  productImage: z.string().uuid().optional().nullable(),
  additionalImage: z.string().uuid().optional().nullable(),
  productVideo: z.string().uuid().optional().nullable(),
  product: z.number().int().optional().nullable(),
  subProduct: z.number().int().optional().nullable(),
  brandId: z.number().int().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  sortOrder: z.number().int().optional().nullable(),
});

export const catalogRoutes = new Hono();

// Public: list catalog with filters
catalogRoutes.get("/", async (c) => {
  const page   = Math.max(1, Number(c.req.query("page")  || 1));
  const limit  = Math.min(100, Math.max(1, Number(c.req.query("limit") || 20)));
  const offset = (page - 1) * limit;
  const search   = c.req.query("search");
  const status   = c.req.query("status");
  const product  = c.req.query("product");    // category id
  const subProduct = c.req.query("subProduct");
  const brandId  = c.req.query("brandId");

  // Legacy Directus-compatible JSON filter
  let filterParam: Record<string, unknown> = {};
  const filterStr = c.req.query("filter");
  if (filterStr) {
    try { filterParam = JSON.parse(filterStr); } catch { /* ignore malformed */ }
  }

  const conditions = [];

  if (search)     conditions.push(ilike(catalog.name, `%${search}%`));
  if (status)     conditions.push(eq(catalog.status, status));
  if (product)    conditions.push(eq(catalog.product, Number(product)));
  if (subProduct) conditions.push(eq(catalog.subProduct, Number(subProduct)));
  if (brandId)    conditions.push(eq(catalog.brandId, Number(brandId)));

  // Legacy Directus filter format
  if (filterParam.product && typeof filterParam.product === "object") {
    const f = filterParam.product as { _eq?: number };
    if (f._eq !== undefined) conditions.push(eq(catalog.product, f._eq));
  }
  if (filterParam.sub_product && typeof filterParam.sub_product === "object") {
    const f = filterParam.sub_product as { _eq?: number };
    if (f._eq !== undefined) conditions.push(eq(catalog.subProduct, f._eq));
  }
  if (filterParam.brand && typeof filterParam.brand === "object") {
    const f = filterParam.brand as { _eq?: number };
    if (f._eq !== undefined) conditions.push(eq(catalog.brandId, f._eq));
  }
  if (filterParam.name && typeof filterParam.name === "object") {
    const f = filterParam.name as { _eq?: string };
    if (f._eq) conditions.push(ilike(catalog.name, `%${f._eq}%`));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [data, countRows] = await Promise.all([
    db.query.catalog.findMany({ where, orderBy: [desc(catalog.dateCreated)], limit, offset }),
    db.select({ count: sql<number>`count(*)::int` }).from(catalog).where(where),
  ]);

  return c.json({ data, meta: { total: countRows[0].count, page, limit } });
});

// Public: get single catalog item by uuid
catalogRoutes.get("/:uuid", async (c) => {
  const { uuid } = c.req.param();
  const item = await db.query.catalog.findFirst({
    where: eq(catalog.uuid, uuid),
  });

  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});

// Protected: create
catalogRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = catalogSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [created] = await db.insert(catalog).values(sanitizeRichTextFields(parsed.data, ["description"])).returning();
  return c.json({ data: created }, 201);
});

// Protected: update
catalogRoutes.put("/:uuid", authMiddleware, async (c) => {
  const { uuid } = c.req.param();
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }

  const parsed = catalogSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(catalog)
    .set({ ...sanitizeRichTextFields(parsed.data, ["description"]), updatedAt: new Date() })
    .where(eq(catalog.uuid, uuid))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// Protected: delete
catalogRoutes.delete("/:uuid", authMiddleware, async (c) => {
  const { uuid } = c.req.param();
  const [deleted] = await db.delete(catalog).where(eq(catalog.uuid, uuid)).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
