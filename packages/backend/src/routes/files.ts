import { Hono } from "hono";
import { db } from "../db";
import { files } from "../db/schema";
import { eq, sql, ilike } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import * as dotenv from "dotenv";

// In production, env vars are injected by Docker — no .env file needed.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../../.env") });
}

// In Docker: UPLOAD_DIR=/app/uploads; locally falls back to <repo-root>/uploads
const UPLOAD_DIR = (() => {
  const dir = process.env.UPLOAD_DIR
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), "uploads");
  // If the configured path is the Docker path and we're not in Docker, use local fallback
  const resolved = dir === "/app/uploads" ? path.join(process.cwd(), "uploads") : dir;
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
})();

export const fileRoutes = new Hono();

// List all files — public (used by media library + picker in dashboard)
fileRoutes.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 24), 100);
  const offset = Number(c.req.query("offset") ?? 0);
  const search = c.req.query("search");
  const where = search ? ilike(files.originalName, `%${search}%`) : undefined;

  const [allFiles, countResult] = await Promise.all([
    db.query.files.findMany({
      where,
      orderBy: (f, { desc }) => [desc(f.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(files).where(where),
  ]);

  return c.json({
    data: allFiles,
    meta: { total: countResult[0].count, limit, offset },
  });
});

// Serve a file by its UUID
fileRoutes.get("/:id", async (c) => {
  const { id } = c.req.param();

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
  });

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  const filePath = path.join(UPLOAD_DIR, file.filename);
  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found on disk" }, 404);
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  // Node's Readable isn't a spec Web ReadableStream — casting it directly
  // (instead of converting via Readable.toWeb()) corrupts the stream's
  // internal state under concurrent requests or aborted connections and
  // crashes the whole process with "ReadableStream is already closed".
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

// Upload a file (protected)
fileRoutes.post("/upload", authMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const maxSize = Number(process.env.MAX_FILE_SIZE) || 52428800; // 50MB
  if (file.size > maxSize) {
    return c.json({ error: `File too large. Max size is ${maxSize / 1024 / 1024}MB` }, 400);
  }

  const ext = mime.extension(file.type) || "bin";
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const [inserted] = await db
    .insert(files)
    .values({
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
    })
    .returning();

  return c.json({ data: inserted }, 201);
});

// Delete a file (protected)
fileRoutes.delete("/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();

  const file = await db.query.files.findFirst({
    where: eq(files.id, id),
  });

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  const filePath = path.join(UPLOAD_DIR, file.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(files).where(eq(files.id, id));

  return c.json({ message: "File deleted" });
});

