import { Hono } from "hono";
import { db } from "../db";
import { medicalSpecialties, categoryProduct, subCategory, brand } from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { ttlCache } from "../middleware/cache";
import { z } from "zod";
import { sanitizeRichTextFields } from "../lib/sanitize";

// Taxonomy tables are small reference data (categories, brands, specialties)
// fetched on nearly every page load (navbar/footer/product filters). Cache
// briefly and cap the result size instead of leaving queries fully unbounded.
const TAXONOMY_CACHE_TTL = 60_000;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function parseLimit(c: { req: { query: (k: string) => string | undefined } }) {
  const raw = c.req.query("limit");
  if (!raw) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Number(raw) || DEFAULT_LIMIT));
}

// ── Medical Specialty ────────────────────────────────────────────────────────

const specialtySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  image: z.string().uuid().optional().nullable(),
});

export const medicalSpecialtyRoutes = new Hono();
medicalSpecialtyRoutes.use("*", ttlCache(TAXONOMY_CACHE_TTL));

medicalSpecialtyRoutes.get("/", async (c) => {
  const limit = parseLimit(c);
  const data = await db.query.medicalSpecialties.findMany({ orderBy: [asc(medicalSpecialties.id)], limit });
  return c.json({ data });
});
medicalSpecialtyRoutes.get("/:id", async (c) => {
  const item = await db.query.medicalSpecialties.findFirst({ where: eq(medicalSpecialties.id, Number(c.req.param("id"))) });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ data: item });
});
medicalSpecialtyRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = specialtySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(medicalSpecialties).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
medicalSpecialtyRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = specialtySchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(medicalSpecialties).set({ ...sanitizeRichTextFields(parsed.data, ["description"]), updatedAt: new Date() }).where(eq(medicalSpecialties.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
medicalSpecialtyRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(medicalSpecialties).where(eq(medicalSpecialties.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});

// ── Category Product ─────────────────────────────────────────────────────────

const categorySchema = z.object({ name: z.string().min(1) });

export const categoryRoutes = new Hono();
categoryRoutes.use("*", ttlCache(TAXONOMY_CACHE_TTL));

categoryRoutes.get("/", async (c) => {
  const limit = parseLimit(c);
  const data = await db.query.categoryProduct.findMany({ limit });
  return c.json({ data });
});
categoryRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(categoryProduct).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
categoryRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(categoryProduct).set(parsed.data).where(eq(categoryProduct.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
categoryRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(categoryProduct).where(eq(categoryProduct.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});

// ── Sub Category ─────────────────────────────────────────────────────────────

const subCategorySchema = z.object({ subCategory: z.string().min(1) });

export const subCategoryRoutes = new Hono();
subCategoryRoutes.use("*", ttlCache(TAXONOMY_CACHE_TTL));

subCategoryRoutes.get("/", async (c) => {
  const limit = parseLimit(c);
  const data = await db.query.subCategory.findMany({ limit });
  return c.json({ data });
});
subCategoryRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = subCategorySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(subCategory).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
subCategoryRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = subCategorySchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(subCategory).set(parsed.data).where(eq(subCategory.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
subCategoryRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(subCategory).where(eq(subCategory.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});

// ── Brand ─────────────────────────────────────────────────────────────────────

const brandSchema = z.object({ brandName: z.string().min(1) });

export const brandRoutes = new Hono();
brandRoutes.use("*", ttlCache(TAXONOMY_CACHE_TTL));

brandRoutes.get("/", async (c) => {
  const limit = parseLimit(c);
  const data = await db.query.brand.findMany({ limit });
  return c.json({ data });
});
brandRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(brand).values(parsed.data).returning();
  return c.json({ data: created }, 201);
});
brandRoutes.put("/:id", authMiddleware, async (c) => {
  const id = Number(c.req.param("id"));
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const parsed = brandSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [updated] = await db.update(brand).set(parsed.data).where(eq(brand.id, id)).returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
brandRoutes.delete("/:id", authMiddleware, async (c) => {
  const [deleted] = await db.delete(brand).where(eq(brand.id, Number(c.req.param("id")))).returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ message: "Deleted" });
});
