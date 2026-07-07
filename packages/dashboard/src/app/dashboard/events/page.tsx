"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { dashboardAppRoutes } from "@/lib/routes";

export default function EventsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["event-types", debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api.get(`/items/event_types?${params}`).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/event_types/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["event-types"] }); },
    onError: () => toast.error("Failed to delete"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((item) => deleteMutation.mutate(item.id));

  const events: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? events.length;

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete event?"
        description={`"${pendingDelete?.nameEvents || pendingDelete?.eventName}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>Events</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{total} events</p>
        </div>
        <Link
          href={`${dashboardAppRoutes.events}/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "var(--ink)", color: "var(--canvas)" }}
        >
          <Plus className="w-4 h-4" /> Add Event
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
              <div className="aspect-video animate-pulse" style={{ background: "var(--surface-2)" }} />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded animate-pulse w-3/4" style={{ background: "var(--surface-2)" }} />
                <div className="h-2.5 rounded animate-pulse w-1/2" style={{ background: "var(--surface-2)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((item: any) => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              >
                <div className="aspect-video relative" style={{ background: "var(--surface-2)" }}>
                  {item.eventImage ? (
                    <Image
                      src={getImageUrl(item.eventImage)}
                      alt={item.nameEvents || item.eventName}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "var(--ink-muted)" }}>No image</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate" style={{ color: "var(--ink)" }}>
                    {item.nameEvents || item.eventName}
                  </h3>
                  {item.slug && <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>/{item.slug}</p>}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`${dashboardAppRoutes.events}/${item.id}`}
                      className="flex-1 text-center text-xs py-1.5 rounded-lg transition-colors"
                      style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
                    >
                      Edit + Gallery
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
          </div>
          {events.length === 0 && (
            <div
              className="rounded-xl py-16 text-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No events match your search" : "No events yet"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
