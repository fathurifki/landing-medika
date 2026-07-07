import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as dotenv from "dotenv";
import path from "path";

// In production, env vars are injected by Docker — no .env file needed.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../../.env") });
}

import { checkConnection } from "./db";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { fileRoutes } from "./routes/files";
import { blogRoutes } from "./routes/blog";
import { catalogRoutes } from "./routes/catalog";
import { partnerRoutes } from "./routes/partners";
import { contactRoutes } from "./routes/contact";
import { eventRoutes, eventTypeRoutes } from "./routes/events";
import {
  medicalSpecialtyRoutes,
  categoryRoutes,
  subCategoryRoutes,
  brandRoutes,
} from "./routes/taxonomy";
import { companyRoutes } from "./routes/company";

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
// logger/prettyJSON add per-request I/O + re-serialization overhead — dev only.
if (process.env.NODE_ENV !== "production") {
  app.use("*", logger());
  app.use("*", prettyJSON());
}
app.use("*", corsMiddleware);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.route("/api/auth", authRoutes);

// Public read-only data endpoints (GET only — mutations still require auth inside each router)
app.route("/api/items/Blog", blogRoutes);
app.route("/api/items/Catalog", catalogRoutes);
app.route("/api/items/partners", partnerRoutes);
app.route("/api/items/medical_specialty", medicalSpecialtyRoutes);
app.route("/api/items/category_product", categoryRoutes);
app.route("/api/items/sub_category", subCategoryRoutes);
app.route("/api/items/brand", brandRoutes);
app.route("/api/items/event_types", eventTypeRoutes);
app.route("/api/items/Events", eventRoutes);
app.route("/api/items/client_contact", contactRoutes);
app.route("/api/items/Company", companyRoutes);

// File serving (public GET, protected upload/delete inside router)
app.route("/files", fileRoutes);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.BACKEND_PORT) || 3001;

async function bootstrap() {
  await checkConnection();

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
