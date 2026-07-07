/**
 * scrape-directus.ts
 *
 * Fetches all data from the old Directus instance (medika-cms.pomerain.org),
 * downloads every file asset, uploads them to the new backend, then inserts
 * all records into the local PostgreSQL database.
 *
 * Idempotent: safe to run multiple times — existing records are skipped.
 *
 * Usage:
 *   pnpm --filter backend scrape
 *   # or directly:
 *   tsx packages/backend/scripts/scrape-directus.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { db } from "../src/db";
import {
  blogs,
  catalog,
  partners,
  medicalSpecialties,
  categoryProduct,
  subCategory,
  brand,
  eventTypes,
  events,
  clientContact,
  company,
  files,
} from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// ── Config ───────────────────────────────────────────────────────────────────

const DIRECTUS_URL = "http://medika-cms.pomerain.org";
const DIRECTUS_ASSETS = `${DIRECTUS_URL}/assets`;
const BACKEND_URL = `http://localhost:${process.env.BACKEND_PORT || 3001}`;

// We need an auth token to upload files to our backend
let AUTH_TOKEN = "";

// Temp dir for downloaded files
const TMP_DIR = path.join(os.tmpdir(), "apm-scrape");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ── Logging ───────────────────────────────────────────────────────────────────

const log = {
  info: (msg: string) => console.log(`  ℹ️  ${msg}`),
  ok: (msg: string) => console.log(`  ✅ ${msg}`),
  skip: (msg: string) => console.log(`  ⏭️  ${msg}`),
  warn: (msg: string) => console.log(`  ⚠️  ${msg}`),
  error: (msg: string) => console.error(`  ❌ ${msg}`),
  section: (msg: string) => console.log(`\n${"─".repeat(60)}\n📦 ${msg}\n${"─".repeat(60)}`),
};

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchDirectus<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`);
    if (!res.ok) {
      log.warn(`Directus ${path} → HTTP ${res.status}`);
      return null;
    }
    const json = await res.json() as { data: T };
    return json.data;
  } catch (e) {
    log.error(`Directus fetch failed: ${path} — ${(e as Error).message}`);
    return null;
  }
}

async function loginBackend(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@apm-medical.co.id",
      password: process.env.ADMIN_PASSWORD || "root",
    }),
  });
  if (!res.ok) throw new Error(`Backend login failed: HTTP ${res.status}`);
  const data = await res.json() as { accessToken: string };
  AUTH_TOKEN = data.accessToken;
  log.ok(`Authenticated as ${process.env.ADMIN_EMAIL}`);
}

/**
 * Download a Directus asset and upload it to the new backend.
 * Returns the new file UUID or null on failure.
 * Caches by Directus UUID to avoid re-downloading on re-runs.
 */
const fileCache = new Map<string, string>(); // directusUuid → newUuid

async function migrateFile(directusUuid: string | null | undefined): Promise<string | null> {
  if (!directusUuid) return null;
  if (fileCache.has(directusUuid)) return fileCache.get(directusUuid)!;

  // Check if already in DB (re-run safety) — use originalName heuristic
  const existing = await db.query.files.findFirst({
    where: eq(files.originalName, directusUuid),
  });
  if (existing) {
    fileCache.set(directusUuid, existing.id);
    return existing.id;
  }

  // Download from Directus
  const assetUrl = `${DIRECTUS_ASSETS}/${directusUuid}`;
  let fileBuffer: Buffer;
  let mimeType = "application/octet-stream";
  let ext = "bin";

  try {
    const res = await fetch(assetUrl);
    if (!res.ok) {
      log.warn(`  File download failed: ${directusUuid} → HTTP ${res.status}`);
      return null;
    }
    mimeType = res.headers.get("content-type")?.split(";")[0] || mimeType;
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
      "video/mp4": "mp4", "video/quicktime": "mov", "application/pdf": "pdf",
    };
    ext = extMap[mimeType] || "bin";
    fileBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    log.warn(`  File download error: ${directusUuid} — ${(e as Error).message}`);
    return null;
  }

  // Write to temp file
  const tmpPath = path.join(TMP_DIR, `${directusUuid}.${ext}`);
  fs.writeFileSync(tmpPath, fileBuffer);

  // Upload to backend
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, `${directusUuid}.${ext}`);

    const uploadRes = await fetch(`${BACKEND_URL}/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      log.warn(`  File upload failed: ${directusUuid} → HTTP ${uploadRes.status}`);
      return null;
    }

    const uploadData = await uploadRes.json() as { data: { id: string } };
    const newId = uploadData.data.id;
    fileCache.set(directusUuid, newId);

    // Clean temp file
    fs.unlinkSync(tmpPath);

    return newId;
  } catch (e) {
    log.warn(`  File upload error: ${directusUuid} — ${(e as Error).message}`);
    return null;
  }
}

// ── Scrapers ─────────────────────────────────────────────────────────────────

async function scrapeCompany() {
  log.section("Company");
  const data = await fetchDirectus<any[]>("/items/Company");
  if (!data?.length) { log.warn("No company data found"); return; }

  const existing = await db.query.company.findFirst();
  if (existing) { log.skip("Company already exists"); return; }

  const item = data[0];
  const logoFooter = await migrateFile(item.logo_footer);
  const logoNavbar = await migrateFile(item.logo_navbar);
  if (logoFooter) log.ok(`logo_footer → ${logoFooter}`);
  if (logoNavbar) log.ok(`logo_navbar → ${logoNavbar}`);

  await db.insert(company).values({
    logoFooter,
    logoNavbar,
    instagram: item.instagram || null,
    linkedin: item.linkedin || null,
    youtube: item.youtube || null,
    address: item.address || null,
    emailAddress: item.email_address || null,
    phoneNumber: item.phone_number || null,
  });
  log.ok("Company profile saved");
}

async function scrapeCategories() {
  log.section("Categories (category_product)");
  const data = await fetchDirectus<any[]>("/items/category_product");
  if (!data?.length) { log.warn("No categories"); return; }

  for (const item of data) {
    const existing = await db.query.categoryProduct.findFirst({
      where: eq(categoryProduct.name, item.name),
    });
    if (existing) { log.skip(`Category: ${item.name}`); continue; }
    await db.insert(categoryProduct).values({ name: item.name });
    log.ok(`Category: ${item.name}`);
  }
}

async function scrapeSubCategories() {
  log.section("Sub Categories");
  const data = await fetchDirectus<any[]>("/items/sub_category");
  if (!data?.length) { log.warn("No sub-categories"); return; }

  for (const item of data) {
    const existing = await db.query.subCategory.findFirst({
      where: eq(subCategory.subCategory, item.sub_category),
    });
    if (existing) { log.skip(`SubCategory: ${item.sub_category}`); continue; }
    await db.insert(subCategory).values({ subCategory: item.sub_category });
    log.ok(`SubCategory: ${item.sub_category}`);
  }
}

async function scrapeBrands() {
  log.section("Brands");
  const data = await fetchDirectus<any[]>("/items/brand");
  if (!data?.length) { log.warn("No brands"); return; }

  for (const item of data) {
    const existing = await db.query.brand.findFirst({
      where: eq(brand.brandName, item.brand_name),
    });
    if (existing) { log.skip(`Brand: ${item.brand_name}`); continue; }
    await db.insert(brand).values({ brandName: item.brand_name });
    log.ok(`Brand: ${item.brand_name}`);
  }
}

async function scrapePartners() {
  log.section("Partners");
  const data = await fetchDirectus<any[]>("/items/partners");
  if (!data?.length) { log.warn("No partners"); return; }

  for (const item of data) {
    const existing = await db.query.partners.findFirst({
      where: eq(partners.name, item.name),
    });
    if (existing) { log.skip(`Partner: ${item.name}`); continue; }

    const logos = await migrateFile(item.logos);
    await db.insert(partners).values({
      name: item.name,
      logos,
      partnershipTypes: item.partnership_types || 1,
    });
    log.ok(`Partner: ${item.name} (logo: ${logos ? "✓" : "✗"})`);
  }
}

async function scrapeMedicalSpecialty() {
  log.section("Medical Specialty");
  const data = await fetchDirectus<any[]>("/items/medical_specialty");
  if (!data?.length) { log.warn("No medical specialties"); return; }

  for (const item of data) {
    const existing = await db.query.medicalSpecialties.findFirst({
      where: eq(medicalSpecialties.title, item.title),
    });
    if (existing) { log.skip(`Specialty: ${item.title}`); continue; }

    const image = await migrateFile(item.image);
    await db.insert(medicalSpecialties).values({
      title: item.title,
      description: item.description || null,
      image,
    });
    log.ok(`Specialty: ${item.title} (image: ${image ? "✓" : "✗"})`);
  }
}

async function scrapeBlogs() {
  log.section("Blogs");
  // Fetch all pages
  let page = 1;
  let allBlogs: any[] = [];
  while (true) {
    const data = await fetchDirectus<any[]>(`/items/Blog?page=${page}&limit=50`);
    if (!data?.length) break;
    allBlogs = allBlogs.concat(data);
    if (data.length < 50) break;
    page++;
  }
  log.info(`Found ${allBlogs.length} blog posts`);

  for (const item of allBlogs) {
    const existing = await db.query.blogs.findFirst({
      where: eq(blogs.slugs, item.slugs || ""),
    });
    if (existing) { log.skip(`Blog: ${item.Title}`); continue; }

    const banner = await migrateFile(item.Banner);
    await db.insert(blogs).values({
      title: item.Title || item.title || "Untitled",
      content: item.Content || item.content || null,
      banner,
      status: item.status === "published" ? "published" : "draft",
      slugs: item.slugs || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      dateCreated: item.date_created ? new Date(item.date_created) : new Date(),
    });
    log.ok(`Blog: ${item.Title || item.title} (banner: ${banner ? "✓" : "✗"})`);
  }
}

async function scrapeCatalog() {
  log.section("Catalog");

  // Build lookup maps for FKs
  const allCategories = await db.query.categoryProduct.findMany();
  const allSubCats = await db.query.subCategory.findMany();
  const allBrands = await db.query.brand.findMany();

  // Fetch all pages from Directus
  let page = 1;
  let allItems: any[] = [];
  while (true) {
    const data = await fetchDirectus<any[]>(`/items/Catalog?page=${page}&limit=50`);
    if (!data?.length) break;
    allItems = allItems.concat(data);
    if (data.length < 50) break;
    page++;
  }
  log.info(`Found ${allItems.length} catalog items`);

  for (const item of allItems) {
    // Check by name to avoid duplicates on re-run
    const existing = await db.query.catalog.findFirst({
      where: eq(catalog.name, item.name || ""),
    });
    if (existing) { log.skip(`Catalog: ${item.name}`); continue; }

    const productImage = await migrateFile(item.product_image);
    const additionalImage = await migrateFile(item.additional_image);
    const productVideo = await migrateFile(item.product_video);

    // Map old category_product id to new id by name
    let productId: number | null = null;
    if (item.product) {
      // item.product may be id or name — try to match
      const catMatch = allCategories.find(
        (c) => c.id === item.product || c.name === item.product
      );
      productId = catMatch?.id ?? null;
    }

    let subProductId: number | null = null;
    if (item.sub_product) {
      const subMatch = allSubCats.find(
        (s) => s.id === item.sub_product || s.subCategory === item.sub_product
      );
      subProductId = subMatch?.id ?? null;
    }

    let brandId: number | null = null;
    if (item.brand) {
      const brandMatch = allBrands.find(
        (b) => b.id === item.brand || b.brandName === item.brand
      );
      brandId = brandMatch?.id ?? null;
    }

    await db.insert(catalog).values({
      uuid: randomUUID(),
      name: item.name || "Unnamed",
      description: item.Description || item.description || null,
      status: item.status === "published" ? "published" : "draft",
      productImage,
      additionalImage,
      productVideo,
      product: productId,
      subProduct: subProductId,
      brandId,
      tags: Array.isArray(item.tags) ? item.tags : [],
      dateCreated: item.date_created ? new Date(item.date_created) : new Date(),
    });
    log.ok(`Catalog: ${item.name} (img: ${productImage ? "✓" : "✗"})`);
  }
}

async function scrapeEventTypes() {
  log.section("Event Types");
  const data = await fetchDirectus<any[]>("/items/event_types");
  if (!data?.length) { log.warn("No event types"); return; }

  for (const item of data) {
    const existing = await db.query.eventTypes.findFirst({
      where: eq(eventTypes.eventName, item.event_name || ""),
    });
    if (existing) { log.skip(`EventType: ${item.name_events}`); continue; }

    const eventImage = await migrateFile(item.event_image);
    await db.insert(eventTypes).values({
      slug: item.slug || null,
      eventName: item.event_name || item.name_events || "unnamed",
      nameEvents: item.name_events || null,
      description: item.Description || item.description || null,
      eventImage,
    });
    log.ok(`EventType: ${item.name_events} (image: ${eventImage ? "✓" : "✗"})`);
  }
}

async function scrapeEvents() {
  log.section("Events (gallery)");

  // Build eventType lookup: old id → new id
  const allEventTypes = await db.query.eventTypes.findMany();
  const directusEventTypes = await fetchDirectus<any[]>("/items/event_types") ?? [];
  const eventTypeIdMap = new Map<number, number>();
  for (const det of directusEventTypes) {
    const match = allEventTypes.find((et) => et.eventName === (det.event_name || det.name_events));
    if (match) eventTypeIdMap.set(det.id, match.id);
  }

  const data = await fetchDirectus<any[]>("/items/Events?limit=500");
  if (!data?.length) { log.warn("No events"); return; }

  log.info(`Found ${data.length} event gallery images`);

  for (const item of data) {
    const eventImage = await migrateFile(item.event_image);
    const medicalEvents = item.medical_events
      ? (eventTypeIdMap.get(item.medical_events) ?? null)
      : null;

    await db.insert(events).values({ eventImage, medicalEvents });
    log.ok(`Event image migrated (type: ${medicalEvents ?? "unknown"})`);
  }
}

async function scrapeContacts() {
  log.section("Client Contacts");
  const data = await fetchDirectus<any[]>("/items/client_contact");
  if (!data?.length) { log.warn("No contacts"); return; }

  for (const item of data) {
    // Skip if email already exists
    const existing = await db.query.clientContact.findFirst({
      where: eq(clientContact.email, item.email || ""),
    });
    if (existing && existing.email === item.email) { log.skip(`Contact: ${item.email}`); continue; }

    await db.insert(clientContact).values({
      name: item.name || "Unknown",
      email: item.email || "unknown@unknown.com",
      phoneNumber: item.phone_number || null,
      message: item.message || null,
      isRead: item.status === "read" || false,
    });
    log.ok(`Contact: ${item.name} <${item.email}>`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 APM Medical — Directus Scraper");
  console.log(`   Source: ${DIRECTUS_URL}`);
  console.log(`   Target: ${BACKEND_URL}`);
  console.log(`   Temp:   ${TMP_DIR}\n`);

  // Login to backend first
  await loginBackend();

  // Run all scrapers in dependency order
  await scrapeCompany();
  await scrapeCategories();
  await scrapeSubCategories();
  await scrapeBrands();
  await scrapePartners();
  await scrapeMedicalSpecialty();
  await scrapeBlogs();
  await scrapeCatalog();
  await scrapeEventTypes();
  await scrapeEvents();
  await scrapeContacts();

  console.log("\n✅ Scraping complete!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
