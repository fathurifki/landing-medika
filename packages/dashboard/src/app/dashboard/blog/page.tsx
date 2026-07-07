"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Pencil, Trash2, Plus, Eye, EyeOff, Search } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { dashboardAppRoutes } from "@/lib/routes";

export default function BlogPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["blogs", debouncedSearch, status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      return api.get(`/items/Blog?${params}`).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/Blog/${id}`),
    onSuccess: () => { toast.success("Blog deleted"); qc.invalidateQueries({ queryKey: ["blogs"] }); },
    onError: () => toast.error("Failed to delete blog"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((blog) => deleteMutation.mutate(blog.id));

  const blogs: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? blogs.length;

  const STATUS_FILTERS = [
    { key: "all",       label: "All" },
    { key: "published", label: "Published" },
    { key: "draft",     label: "Draft" },
  ] as const;

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete blog post?"
        description={`"${pendingDelete?.title}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>Blog</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{total} posts</p>
        </div>
        <Link
          href={`${dashboardAppRoutes.blog}/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-opacity"
          style={{ background: "var(--ink)", color: "var(--canvas)" }}
        >
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
          <input
            type="text"
            placeholder="Search posts…"
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
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
          <table className="w-full text-xs">
            <thead style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}>
              <tr>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-muted)" }}>Title</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-muted)" }}>Status</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-muted)" }}>Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody style={{ background: "var(--surface-1)" }}>
              {blogs.map((blog: any, i: number) => (
                <tr key={blog.id} style={{ borderTop: i > 0 ? "1px solid var(--hairline-soft)" : "none" }}>
                  <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: "var(--ink)" }}>{blog.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: blog.status === "published" ? "#16a34a22" : "var(--surface-2)",
                        color: blog.status === "published" ? "#16a34a" : "var(--ink-muted)",
                      }}
                    >
                      {blog.status === "published" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {blog.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink-muted)" }}>{formatDate(blog.dateCreated)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`${dashboardAppRoutes.blog}/${blog.id}`}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => requestDelete(blog)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--ink-muted)" }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!blogs.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
                    {search ? "No posts match your search" : "No blog posts yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
