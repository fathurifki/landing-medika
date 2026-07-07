"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getImageUrl, filesApi } from "@/lib/api";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Search, Copy, Check } from "lucide-react";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";

const PAGE_SIZE = 24;

// ─── Lazy image with skeleton ────────────────────────────────────────────────
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
      {/* Skeleton */}
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse rounded"
          style={{ background: "var(--surface-2)" }}
        />
      )}
      {inView && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 17vw, 12vw"
          onLoad={() => setLoaded(true)}
          className="object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded transition-colors"
      style={{ color: "var(--ink-muted)" }}
      title="Copy UUID"
    >
      {copied ? <Check className="w-3 h-3" style={{ color: "#22c55e" }} /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
    >
      <div className="aspect-square animate-pulse" style={{ background: "var(--surface-2)" }} />
      <div className="p-1.5 space-y-1">
        <div className="h-2.5 rounded animate-pulse w-3/4" style={{ background: "var(--surface-2)" }} />
        <div className="h-2 rounded animate-pulse w-1/2" style={{ background: "var(--surface-2)" }} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MediaPage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video" | "other">("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["media"],
    queryFn: ({ pageParam = 0 }) =>
      filesApi
        .get(`/files?limit=${PAGE_SIZE}&offset=${pageParam}`)
        .then((r) => r.data as { data: any[]; meta: { total: number; limit: number; offset: number } }),
    getNextPageParam: (last) => {
      const next = last.meta.offset + last.meta.limit;
      return next < last.meta.total ? next : undefined;
    },
    initialPageParam: 0,
  });

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
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
    mutationFn: (id: string) => filesApi.delete(`/files/${id}`),
    onSuccess: () => { toast.success("File deleted"); qc.invalidateQueries({ queryKey: ["media"] }); },
    onError: () => toast.error("Failed to delete"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((file) => deleteMutation.mutate(file.id));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;
    setUploading(true);
    try {
      // Upload concurrently instead of one-at-a-time — much faster for
      // multi-file selections, still bounded so we don't flood the server.
      const CONCURRENCY = 4;
      let cursor = 0;
      const worker = async () => {
        while (cursor < fileList.length) {
          const file = fileList[cursor++];
          const fd = new FormData();
          fd.append("file", file);
          await filesApi.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, fileList.length) }, worker));
      toast.success(`${fileList.length} file${fileList.length > 1 ? "s" : ""} uploaded`);
      qc.invalidateQueries({ queryKey: ["media"] });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const allFiles: any[] = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  // allFiles grows as infinite scroll loads more pages — memoize so these
  // scans only re-run when the file list or filters actually change.
  const filtered = useMemo(() => allFiles.filter((f) => {
    const matchSearch = !search || f.originalName.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "image" ? f.mimeType?.startsWith("image/") :
      filter === "video" ? f.mimeType?.startsWith("video/") :
      !f.mimeType?.startsWith("image/") && !f.mimeType?.startsWith("video/");
    return matchSearch && matchFilter;
  }), [allFiles, search, filter]);

  const images = useMemo(() => filtered.filter((f) => f.mimeType?.startsWith("image/")), [filtered]);
  const nonImages = useMemo(() => filtered.filter((f) => !f.mimeType?.startsWith("image/")), [filtered]);

  const counts = useMemo(() => ({
    image: allFiles.filter((f) => f.mimeType?.startsWith("image/")).length,
    video: allFiles.filter((f) => f.mimeType?.startsWith("video/")).length,
  }), [allFiles]);

  const FILTERS = [
    { key: "all",   label: `All (${total})` },
    { key: "image", label: `Images (${counts.image})` },
    { key: "video", label: `Videos (${counts.video})` },
    { key: "other", label: `Other` },
  ] as const;

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete file?"
        description={`"${pendingDelete?.originalName}" will be permanently deleted from the media library.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>
            Media Library
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            {total} files · {(allFiles.reduce((a, f) => a + (f.size ?? 0), 0) / 1024 / 1024).toFixed(1)} MB loaded
          </p>
        </div>
        <label
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-opacity ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          style={{ background: "var(--ink)", color: "var(--canvas)" }}
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" className="hidden" multiple onChange={handleUpload} accept="image/*,video/*,application/pdf" />
        </label>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
          />
        </div>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: filter === key ? "var(--surface-2)" : "transparent",
                color: filter === key ? "var(--ink)" : "var(--ink-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Images grid */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
                Images — {images.length}{hasNextPage ? "+" : ""}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {images.map((file: any) => (
                  <div
                    key={file.id}
                    className="group relative rounded-xl overflow-hidden"
                    style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                  >
                    <div className="aspect-square">
                      <LazyImage src={getImageUrl(file.id)} alt={file.originalName} />
                    </div>
                    <div className="p-1.5">
                      <p className="text-xs truncate" style={{ color: "var(--ink-muted)" }} title={file.originalName}>
                        {file.originalName.split(".")[0].slice(0, 12)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="absolute top-1 right-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex">
                      <CopyBtn text={file.id} />
                      <button
                        onClick={() => requestDelete(file)}
                        className="p-1 rounded-lg transition-colors"
                        style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Skeleton cards while loading next page */}
                {isFetchingNextPage && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
              </div>
            </div>
          )}

          {/* Non-image files table */}
          {nonImages.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
                Other Files — {nonImages.length}
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
                <table className="w-full text-xs">
                  <thead style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}>
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--ink-muted)" }}>Name</th>
                      <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--ink-muted)" }}>Type</th>
                      <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--ink-muted)" }}>Size</th>
                      <th className="text-left px-4 py-2.5 font-medium" style={{ color: "var(--ink-muted)" }}>Uploaded</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody style={{ background: "var(--surface-1)" }}>
                    {nonImages.map((file: any, i: number) => (
                      <tr key={file.id} style={{ borderTop: i > 0 ? "1px solid var(--hairline-soft)" : "none" }}>
                        <td className="px-4 py-2.5 font-medium max-w-xs truncate" style={{ color: "var(--ink)" }}>{file.originalName}</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--ink-muted)" }}>{file.mimeType}</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--ink-muted)" }}>{(file.size / 1024).toFixed(0)} KB</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--ink-muted)" }}>{formatDate(file.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            <CopyBtn text={file.id} />
                            <button
                              onClick={() => requestDelete(file)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: "var(--ink-muted)" }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filtered.length === 0 && !isLoading && (
            <div
              className="rounded-xl py-16 text-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No files match your search" : "No files yet"}
              </p>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Load more indicator */}
          {isFetchingNextPage && (
            <p className="text-xs text-center py-4" style={{ color: "var(--ink-muted)" }}>Loading more…</p>
          )}
          {!hasNextPage && allFiles.length > 0 && (
            <p className="text-xs text-center py-4" style={{ color: "var(--ink-muted)" }}>
              All {total} files loaded
            </p>
          )}
        </div>
      )}
    </div>
  );
}
