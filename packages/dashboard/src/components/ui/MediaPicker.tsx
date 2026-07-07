"use client";

import { useQuery } from "@tanstack/react-query";
import { filesApi, getImageUrl } from "@/lib/api";
import { useState } from "react";
import { X, Search, Images } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import Image from "next/image";

interface MediaPickerProps {
  onSelect: (fileId: string) => void;
  onClose: () => void;
  accept?: "image" | "video" | "all";
}

export function MediaPicker({ onSelect, onClose, accept = "image" }: MediaPickerProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Shared /files client (media library uses the same one) — previously this
  // hit /api/files by mistake and 404'd on every open, plus fetched everything
  // unbounded. Now paginated + filtered server-side.
  const { data, isLoading } = useQuery({
    queryKey: ["media-picker", debouncedSearch, accept],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return filesApi.get(`/files?${params}`).then((r) => r.data.data as any[]);
    },
  });

  const filtered = (data ?? []).filter((f: any) => {
    const matchType =
      accept === "all" ? true :
      accept === "image" ? f.mimeType?.startsWith("image/") :
      f.mimeType?.startsWith("video/");
    return matchType;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
              Media Library
            </h2>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {filtered.length} file{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--ink-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg"
              style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>No files found</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
              {filtered.map((file: any) => (
                <button
                  key={file.id}
                  onClick={() => { onSelect(file.id); onClose(); }}
                  className="group relative aspect-square rounded-lg overflow-hidden transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
                  title={file.originalName}
                >
                  {file.mimeType?.startsWith("image/") ? (
                    <Image
                      src={getImageUrl(file.id)}
                      alt={file.originalName}
                      fill
                      sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 16vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {file.mimeType?.split("/")[1]?.toUpperCase() ?? "FILE"}
                      </span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,153,255,0.3)" }}
                  >
                    <span className="text-xs font-medium text-white">Select</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
