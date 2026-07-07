"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api, getImageUrl, uploadFile } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Images, X } from "lucide-react";
import Link from "next/link";
import { RichEditor } from "@/components/editor/LazyRichEditor";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { dashboardAppRoutes } from "@/lib/routes";

// ── Image/Video field with dual-mode: upload OR pick from media ───────────────
function MediaField({
  label,
  fileId,
  onSelect,
  accept = "image",
}: {
  label: string;
  fileId?: string | null;
  onSelect: (id: string | null) => void;
  accept?: "image" | "video" | "all";
}) {
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(false);

  const preview = fileId ? getImageUrl(fileId) : null;
  const isVideo = fileId && accept === "video";

  async function handleFile(f: File) {
    setUploading(true);
    try {
      const id = await uploadFile(f);
      onSelect(id);
    } catch {
      toast.error(`Failed to upload ${label}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>
          {label}
        </label>

        {/* Preview */}
        {preview && (
          <div className="relative mb-2 inline-block">
            {isVideo ? (
              <video
                src={preview}
                className="w-28 h-28 object-cover rounded-lg"
                style={{ border: "1px solid var(--hairline)" }}
              />
            ) : (
              <img
                src={preview}
                alt={label}
                className="w-28 h-28 object-contain rounded-lg"
                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              title="Remove"
            >
              <X className="w-3 h-3" style={{ color: "var(--ink-muted)" }} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {/* Upload */}
          <label
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
          >
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept={accept === "video" ? "video/*" : accept === "all" ? "image/*,video/*" : "image/*"}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>

          {/* Pick from media */}
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}
          >
            <Images className="w-3 h-3" />
            Media
          </button>
        </div>
      </div>

      {picker && (
        <MediaPicker
          accept={accept}
          onSelect={(id) => onSelect(id)}
          onClose={() => setPicker(false)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CatalogFormPage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const isNew = params.uuid === "new";

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "draft" as "draft" | "published",
    productImage: null as string | null,
    additionalImage: null as string | null,
    productVideo: null as string | null,
    product: "" as string,
    subProduct: "" as string,
    brandId: "" as string,
    tags: "",
  });
  const [loaded, setLoaded] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["catalog-item", params.uuid],
    queryFn: () => api.get(`/items/Catalog/${params.uuid}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => api.get("/items/category_product").then((r) => r.data.data) });
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: () => api.get("/items/sub_category").then((r) => r.data.data) });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: () => api.get("/items/brand").then((r) => r.data.data) });

  useEffect(() => {
    if (existing && !loaded) {
      setForm({
        name: existing.name || "",
        description: existing.description || "",
        status: existing.status || "draft",
        productImage: existing.productImage || null,
        additionalImage: existing.additionalImage || null,
        productVideo: existing.productVideo || null,
        product: existing.product ? String(existing.product) : "",
        subProduct: existing.subProduct ? String(existing.subProduct) : "",
        brandId: existing.brandId ? String(existing.brandId) : "",
        tags: (existing.tags || []).join(", "),
      });
      setLoaded(true);
    }
  }, [existing, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        status: form.status,
        productImage: form.productImage || undefined,
        additionalImage: form.additionalImage || undefined,
        productVideo: form.productVideo || undefined,
        product: form.product ? Number(form.product) : undefined,
        subProduct: form.subProduct ? Number(form.subProduct) : undefined,
        brandId: form.brandId ? Number(form.brandId) : undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (isNew) return api.post("/items/Catalog", payload);
      return api.put(`/items/Catalog/${params.uuid}`, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? "Product created" : "Product updated");
      qc.invalidateQueries({ queryKey: ["catalog"] });
      router.push(dashboardAppRoutes.catalog);
    },
    onError: () => toast.error("Failed to save"),
  });

  if (!isNew && isLoading) return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dashboardAppRoutes.catalog} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--ink-muted)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>
          {isNew ? "New Product" : "Edit Product"}
        </h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Description</label>
          <RichEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} minHeight="min-h-48" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Category</label>
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
              <option value="">None</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Sub Category</label>
            <select value={form.subProduct} onChange={(e) => setForm({ ...form, subProduct: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
              <option value="">None</option>
              {subCategories?.map((c: any) => <option key={c.id} value={c.id}>{c.subCategory}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Brand</label>
            <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
              <option value="">None</option>
              {brands?.map((b: any) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Tags (comma-separated)</label>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }} />
        </div>

        {/* Media fields */}
        <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>Media — Upload a new file or pick from Media Library</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <MediaField label="Product Image" fileId={form.productImage} onSelect={(id) => setForm({ ...form, productImage: id })} accept="image" />
            <MediaField label="Additional Image" fileId={form.additionalImage} onSelect={(id) => setForm({ ...form, additionalImage: id })} accept="image" />
            <MediaField label="Product Video" fileId={form.productVideo} onSelect={(id) => setForm({ ...form, productVideo: id })} accept="all" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-muted)" }}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: "var(--ink)", color: "var(--canvas)" }}
          >
            {saveMutation.isPending ? "Saving…" : "Save Product"}
          </button>
          <Link href={dashboardAppRoutes.catalog} className="px-5 py-2 rounded-full text-sm transition-colors"
            style={{ border: "1px solid var(--hairline)", color: "var(--ink-muted)" }}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
