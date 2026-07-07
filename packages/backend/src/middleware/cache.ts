import type { MiddlewareHandler } from "hono";

interface CacheEntry {
  body: string;
  status: number;
  contentType: string;
  expires: number;
}

/**
 * Simple per-router in-memory TTL cache for public GET endpoints that rarely
 * change (taxonomy, company profile, partners, event types). Any non-GET
 * request through the same router instance invalidates its whole cache, so
 * dashboard edits show up immediately on the next request.
 *
 * Scope this per-route-group by mounting it at the top of that router file —
 * each call to ttlCache() creates its own isolated store.
 */
export function ttlCache(ttlMs = 60_000): MiddlewareHandler {
  const store = new Map<string, CacheEntry>();

  return async (c, next) => {
    if (c.req.method !== "GET") {
      await next();
      store.clear();
      return;
    }

    const key = c.req.url;
    const now = Date.now();
    const cached = store.get(key);

    if (cached && cached.expires > now) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "HIT" },
      });
    }

    await next();

    if (c.res.status >= 200 && c.res.status < 300) {
      const body = await c.res.clone().text();
      store.set(key, {
        body,
        status: c.res.status,
        contentType: c.res.headers.get("content-type") || "application/json",
        expires: now + ttlMs,
      });
      c.res.headers.set("X-Cache", "MISS");
    }
  };
}
