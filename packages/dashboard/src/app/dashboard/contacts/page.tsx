"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, CheckCircle, Mail, Phone, Clock, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [limit, setLimit] = useState(100);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["contacts", debouncedSearch, readFilter, limit],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (readFilter === "unread") params.set("read", "false");
      if (readFilter === "read")   params.set("read", "true");
      return api.get(`/items/client_contact?${params}`).then((r) => r.data);
    },
    enabled: status === "authenticated",
    retry: 2,
    retryDelay: 1000,
  });

  // Lightweight count-only query — avoids inferring "unread" from whatever
  // page of contacts happens to be loaded on the client.
  const { data: unreadData } = useQuery({
    queryKey: ["contacts-unread-count"],
    queryFn: () => api.get("/items/client_contact?read=false&limit=1").then((r) => r.data),
    enabled: status === "authenticated",
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/items/client_contact/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts-unread-count"] });
      if (selected) setSelected({ ...selected, isRead: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/client_contact/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts-unread-count"] });
      setSelected(null);
    },
    onError: () => toast.error("Failed to delete"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((contact) => deleteMutation.mutate(contact.id));

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
      </div>
    );
  }

  const contacts: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? contacts.length;
  const unread: number = unreadData?.meta?.total ?? 0;

  const READ_FILTERS = [
    { key: "all",    label: "All" },
    { key: "unread", label: "Unread" },
    { key: "read",   label: "Read" },
  ] as const;

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 0 }}>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete contact?"
        description={`Message from "${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      {/* Left — contact list */}
      <div className="flex flex-col" style={{ width: "380px", flexShrink: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>
              Contacts
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {total} total · {unread} unread
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
            />
          </div>
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
            {READ_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setReadFilter(key)}
                className="flex-1 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: readFilter === key ? "var(--surface-2)" : "transparent",
                  color: readFilter === key ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 overflow-y-auto flex-1">
          {contacts.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No contacts match your search" : "No messages yet"}
              </p>
            </div>
          ) : (
            contacts.map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item);
                  if (!item.isRead) readMutation.mutate(item.id);
                }}
                className="w-full text-left rounded-xl p-3.5 transition-all"
                style={{
                  background: selected?.id === item.id ? "var(--surface-2)" : "var(--surface-1)",
                  border: `1px solid ${
                    selected?.id === item.id ? "var(--accent-blue)" :
                    !item.isRead ? "var(--accent-blue)44" : "var(--hairline)"
                  }`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                        {item.name}
                      </span>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent-blue)" }} />
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--ink-muted)" }}>{item.email}</p>
                    <p className="text-xs truncate mt-1 line-clamp-1" style={{ color: "var(--ink-muted)" }}>{item.message}</p>
                  </div>
                  <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              </button>
            ))
          )}
          {contacts.length > 0 && contacts.length < total && (
            <button
              onClick={() => setLimit((l) => l + 100)}
              disabled={isFetching}
              className="w-full text-center text-xs py-2 rounded-lg transition-colors"
              style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
            >
              {isFetching ? "Loading…" : `Load more (${total - contacts.length} remaining)`}
            </button>
          )}
        </div>
      </div>

      {/* Right — detail panel */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div
            className="rounded-xl p-6 h-full"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.03em" }}>
                  {selected.name}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                    <Mail className="w-3.5 h-3.5" />{selected.email}
                  </span>
                  {selected.phoneNumber && (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                      <Phone className="w-3.5 h-3.5" />{selected.phoneNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                    <Clock className="w-3.5 h-3.5" />{formatDate(selected.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!selected.isRead && (
                  <button
                    onClick={() => readMutation.mutate(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--surface-2)", color: "var(--ink-muted)", border: "1px solid var(--hairline)" }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
                <button
                  onClick={() => requestDelete(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "var(--surface-2)", color: "var(--ink-muted)", border: "1px solid var(--hairline)" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--hairline)", marginBottom: "1.5rem" }} />

            <div>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--ink-muted)" }}>Message</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink)" }}>
                {selected.message || <span style={{ color: "var(--ink-muted)" }}>No message content</span>}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl flex items-center justify-center"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", height: "100%", minHeight: "300px" }}
          >
            <div className="text-center">
              <Mail className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--hairline)" }} />
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
