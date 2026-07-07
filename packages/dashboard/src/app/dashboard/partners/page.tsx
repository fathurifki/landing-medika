"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Globe, MapPin, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { dashboardAppRoutes } from "@/lib/routes";

export default function PartnersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "1" | "2">("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["partners", debouncedSearch, type],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (type !== "all") params.set("type", type);
      return api.get(`/items/partners?${params}`).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/partners/${id}`),
    onSuccess: () => { toast.success("Partner deleted"); qc.invalidateQueries({ queryKey: ["partners"] }); },
    onError: () => toast.error("Failed to delete partner"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((partner) => deleteMutation.mutate(partner.id));

  const partners: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? partners.length;

  const international = type === "2" ? [] : partners.filter((p) => p.partnershipTypes === 1);
  const local         = type === "1" ? [] : partners.filter((p) => p.partnershipTypes === 2);

  const TYPE_FILTERS = [
    { key: "all", label: "All" },
    { key: "1",   label: "International" },
    { key: "2",   label: "Local" },
  ] as const;

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete partner?"
        description={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>Partners</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{total} partners</p>
        </div>
        <Link
          href={`${dashboardAppRoutes.partners}/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "var(--ink)", color: "var(--canvas)" }}
        >
          <Plus className="w-4 h-4" /> Add Partner
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Search partners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
          />
        </div>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
          {TYPE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: type === key ? "var(--surface-2)" : "transparent",
                color: type === key ? "var(--ink)" : "var(--ink-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl h-36 animate-pulse" style={{ background: "var(--surface-1)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: "International Partners", icon: Globe, items: international },
            { label: "Local Partners",         icon: MapPin, items: local },
          ].map(({ label, icon: Icon, items }) => (
            items.length > 0 && (
              <div key={label}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
                  <h2 className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                    {label} ({items.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {items.map((partner: any) => (
                    <div
                      key={partner.id}
                      className="rounded-xl p-3 flex flex-col items-center gap-2"
                      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                    >
                      <div className="w-16 h-16 relative flex items-center justify-center">
                        {partner.logos ? (
                          <Image
                            src={getImageUrl(partner.logos)}
                            alt={partner.name}
                            fill
                            sizes="64px"
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-full h-full rounded-lg" style={{ background: "var(--surface-2)" }} />
                        )}
                      </div>
                      <p className="text-xs text-center font-medium truncate w-full" style={{ color: "var(--ink)" }}>{partner.name}</p>
                      <div className="flex gap-1 w-full">
                        <Link
                          href={`${dashboardAppRoutes.partners}/${partner.id}`}
                          className="flex-1 text-center text-xs py-1 rounded-lg transition-colors"
                          style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => requestDelete(partner)}
                          className="flex-1 text-xs py-1 rounded-lg transition-colors"
                          style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {partners.length === 0 && (
            <div
              className="rounded-xl py-16 text-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No partners match your search" : "No partners yet"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
