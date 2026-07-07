import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

// Try multiple possible root locations for .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(__dirname, "../../../../.env"),   // dev: src/lib → root
  path.resolve(__dirname, "../../../.env"),       // alt
  path.resolve(process.cwd(), ".env"),            // cwd fallback
  path.resolve(process.cwd(), "../../.env"),      // packages/landing → root
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

export const VITE_API_URL =
  import.meta.env?.VITE_API_URL ?? process.env.VITE_API_URL ?? "http://localhost:3001/api";
export const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.BACKEND_URL ??
  VITE_API_URL;
export const VITE_IMAGE_URL =
  import.meta.env?.VITE_IMAGE_URL ?? process.env.VITE_IMAGE_URL ?? "http://localhost:3001/files";
export const VITE_SITE_URL =
  import.meta.env?.VITE_SITE_URL ?? process.env.VITE_SITE_URL ?? "";
