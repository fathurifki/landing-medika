/**
 * Sync files from uploads/ directory into the `files` DB table.
 * Run once: npx tsx scripts/sync-uploads.ts
 */
import fs from "fs";
import path from "path";
import mime from "mime-types";
import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: "../../.env" });

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const entries = fs.readdirSync(UPLOAD_DIR).filter((f) => {
    const stat = fs.statSync(path.join(UPLOAD_DIR, f));
    return stat.isFile();
  });

  console.log(`Found ${entries.length} files in uploads/`);

  let inserted = 0;
  let skipped = 0;

  for (const filename of entries) {
    // UUID is the filename stem (e.g. "abc-123.jpeg" → id = "abc-123")
    const id = filename.replace(/\.[^.]+$/, "");
    const filePath = path.join(UPLOAD_DIR, filename);
    const stat = fs.statSync(filePath);
    const mimeType = mime.lookup(filename) || "application/octet-stream";

    // Check if already in DB
    const { rows } = await pool.query("SELECT id FROM files WHERE id = $1", [id]);
    if (rows.length > 0) {
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO files (id, filename, original_name, mime_type, size, path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, filename, filename, mimeType, stat.size, filePath]
    );

    inserted++;
    process.stdout.write(`  ✓ ${filename} (${(stat.size / 1024).toFixed(0)} KB)\n`);
  }

  console.log(`\nDone — inserted: ${inserted}, skipped (already in DB): ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
