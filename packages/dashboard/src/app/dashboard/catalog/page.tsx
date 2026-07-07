"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Search, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { dashboardAppRoutes } from "@/lib/routes";

const PAGE_SIZE = 20;

// ─── Lazy image with skeleton ─────────────────────────────────────────────────
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full relative">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: "var(--surface-2)" }} />
      )}
      {inView && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onLoad={() => setLoaded(true)}
          className="object-contain transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
      <div className="aspect-square animate-pulse" style={{ background: "var(--surface-2)" }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded animate-pulse w-3/4" style={{ background: "var(--surface-2)" }} />
        <div className="h-2.5 rounded animate-pulse w-1/3" style={{ background: "var(--surface-2)" }} />
        <div className="flex gap-2 mt-3">
          <div className="flex-1 h-7 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
          <div className="flex-1 h-7 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const debouncedSearch = useDebounce(search, 300);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["catalog", debouncedSearch, status],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      return api.get(`/items/Catalog?${params}`).then((r) => r.data as {
        data: any[];
        meta: { total: number; page: number; limit: number };
      });
    },
    getNextPageParam: (last) => {
      const loaded = (last.meta.page - 1) * last.meta.limit + last.data.length;
      return loaded < last.meta.total ? last.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => api.delete(`/items/Catalog/${uuid}`),
    onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["catalog"] }); },
    onError: () => toast.error("Failed to delete product"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((item) => deleteMutation.mutate(item.uuid));

  const allItems: any[] = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  const STATUS_FILTERS = [
    { key: "all",       label: "All" },
    { key: "published", label: "Published" },
    { key: "draft",     label: "Draft" },
  ] as const;

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete product?"
        description={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>Catalog</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            {total} products{hasNextPage ? ` · ${allItems.length} loaded` : ""}
          </p>
        </div>
        <Link
          href={`${dashboardAppRoutes.catalog}/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "var(--ink)", color: "var(--canvas)" }}
        >
          <Plus className="w-4 h-4" /> New Product
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
          />
        </div>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: status === key ? "var(--surface-2)" : "transparent",
                color: status === key ? "var(--ink)" : "var(--ink-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allItems.map((item: any) => (
              <div
                key={item.uuid}
                className="rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              >
                <div className="aspect-square p-4" style={{ background: "var(--surface-2)" }}>
                  {item.productImage ? (
                    <LazyImage src={getImageUrl(item.productImage)} alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "var(--ink-muted)" }}>
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate" style={{ color: "var(--ink)" }}>{item.name}</h3>
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1"
                    style={{
                      background: item.status === "published" ? "#16a34a22" : "var(--surface-2)",
                      color: item.status === "published" ? "#16a34a" : "var(--ink-muted)",
                    }}
                  >
                    {item.status === "published" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {item.status}
                  </span>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`${dashboardAppRoutes.catalog}/${item.uuid}`}
                      className="flex-1 text-center text-xs py-1.5 rounded-lg transition-colors"
                      style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => requestDelete(item)}
                      className="flex-1 text-xs py-1.5 rounded-lg transition-colors"
                      style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Skeleton cards while loading next page */}
            {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
          </div>

          {allItems.length === 0 && (
            <div
              className="rounded-xl py-16 text-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No products match your search" : "No products yet"}
              </p>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1 mt-4" />

          {!hasNextPage && allItems.length > 0 && (
            <p className="text-xs text-center py-4" style={{ color: "var(--ink-muted)" }}>
              All {total} products loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}
