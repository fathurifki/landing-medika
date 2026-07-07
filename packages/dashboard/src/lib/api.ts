import axios from "axios";
import { getSession } from "next-auth/react";

// Browser: always call the same origin the dashboard is served from (router
// proxies /api and /files). Server: use internal Docker URL or build-time env.
function resolveApiUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api"
  );
}

function resolveFilesBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:3001/files"
  ).replace(/\/files$/, "");
}

function resolveImageUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/files`;
  }
  return process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:3001/files";
}

export const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

// Files live under /files (not /api/items/*) — shared client so every
// consumer (media library, media picker, uploads) hits the same base URL
// instead of each re-deriving it (and occasionally getting it wrong).
export const filesApi = axios.create();

// Module-level token cache — avoids hitting /api/auth/session on every request.
// Token is refreshed only when it expires (NextAuth JWT strategy handles rotation).
let cachedToken: string | null = null;
let cacheExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 30s buffer)
  if (cachedToken && Date.now() < cacheExpiry - 30_000) {
    return cachedToken;
  }

  // Fetch fresh session and cache the token
  const session = await getSession();
  cachedToken = (session as any)?.accessToken ?? null;

  // accessTokenExpires is set to 14 min from issue in auth.ts
  const expires = (session as any)?.accessTokenExpires as number | undefined;
  cacheExpiry = expires ?? Date.now() + 13 * 60 * 1000;

  return cachedToken;
}

// Called by SessionProvider via a custom event when session changes (login/logout/refresh)
export function invalidateTokenCache() {
  cachedToken = null;
  cacheExpiry = 0;
}

// Attach access token on every request — uses cache, not a live session fetch
async function attachToken(config: any) {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

function clearCacheOn401(error: any) {
  if (error.response?.status === 401) {
    invalidateTokenCache();
  }
  return Promise.reject(error);
}

api.interceptors.request.use(async (config) => {
  config.baseURL = resolveApiUrl();
  return attachToken(config);
});
api.interceptors.response.use((res) => res, clearCacheOn401);

filesApi.interceptors.request.use(async (config) => {
  config.baseURL = resolveFilesBase();
  return attachToken(config);
});
filesApi.interceptors.response.use((res) => res, clearCacheOn401);

export const IMAGE_URL = resolveImageUrl();

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23111111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999999' font-family='Arial,sans-serif' font-size='20'%3ENo image%3C/text%3E%3C/svg%3E";

export function getImageUrl(fileId: string | null | undefined): string {
  if (!fileId) return FALLBACK_IMAGE_DATA_URI;
  return `${resolveImageUrl()}/${fileId}`;
}

// Upload a file — hits /files/upload (not /api/files/upload)
export async function uploadFile(file: File): Promise<string> {
  const token = await getAccessToken();

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${resolveFilesBase()}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}` },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Upload failed: ${res.status}`);
  }

  const json = await res.json();
  return json.data.id as string;
}
