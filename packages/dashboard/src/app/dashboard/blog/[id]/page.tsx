"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api, getImageUrl, uploadFile } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RichEditor } from "@/components/editor/LazyRichEditor";
import { dashboardAppRoutes } from "@/lib/routes";

export default function BlogFormPage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const isNew = params.id === "new";
  const [form, setForm] = useState({ title: "", content: "", status: "draft" as "draft" | "published", slugs: "", tags: "" });
  const [loaded, setLoaded] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerId, setBannerId] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["blog", params.id],
    queryFn: () => api.get(`/items/Blog/${params.id}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing && !loaded) {
      setForm({ title: existing.title || "", content: existing.content || "", status: existing.status || "draft", slugs: existing.slugs || "", tags: (existing.tags || []).join(", ") });
      setBannerId(existing.banner || null);
      if (existing.banner) setBannerPreview(getImageUrl(existing.banner));
      setLoaded(true);
    }
  }, [existing, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalBannerId = bannerId;
      if (bannerFile) {
        finalBannerId = await uploadFile(bannerFile);
      }
      const payload = { ...form, banner: finalBannerId, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      if (isNew) return api.post("/items/Blog", payload);
      return api.put(`/items/Blog/${params.id}`, payload);
    },
    onSuccess: () => { toast.success(isNew ? "Blog created" : "Blog updated"); qc.invalidateQueries({ queryKey: ["blogs"] }); router.push(dashboardAppRoutes.blog); },
    onError: () => toast.error("Failed to save"),
  });

  if (!isNew && isLoading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dashboardAppRoutes.blog} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New Blog Post" : "Edit Blog Post"}</h1>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input type="text" value={form.slugs} onChange={(e) => setForm({ ...form, slugs: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <RichEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} minHeight="min-h-64" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="medical, device, ventilator" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
          {bannerPreview && <img src={bannerPreview} alt="preview" className="w-full max-h-48 object-cover rounded-lg mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }} className="text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-colors">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <Link href={dashboardAppRoutes.blog} className="px-6 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
