"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api, getImageUrl, uploadFile } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { dashboardAppRoutes } from "@/lib/routes";

export default function PartnerFormPage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const isNew = params.id === "new";

  const [form, setForm] = useState({ name: "", partnershipTypes: 1 as 1 | 2, logos: null as string | null });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["partner", params.id],
    queryFn: () => api.get(`/items/partners/${params.id}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setForm({ name: existing.name || "", partnershipTypes: existing.partnershipTypes || 1, logos: existing.logos || null });
      if (existing.logos) setLogoPreview(getImageUrl(existing.logos));
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let logosId = form.logos;
      if (logoFile) {
        setUploading(true);
        logosId = await uploadFile(logoFile);
        setUploading(false);
      }
      const payload = { ...form, logos: logosId };
      if (isNew) return api.post("/items/partners", payload);
      return api.put(`/items/partners/${params.id}`, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? "Partner created" : "Partner updated");
      qc.invalidateQueries({ queryKey: ["partners"] });
      router.push(dashboardAppRoutes.partners);
    },
    onError: () => toast.error("Failed to save"),
  });

  if (!isNew && isLoading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dashboardAppRoutes.partners} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New Partner" : "Edit Partner"}</h1>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Partnership Type</label>
          <select value={form.partnershipTypes} onChange={(e) => setForm({ ...form, partnershipTypes: Number(e.target.value) as 1 | 2 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value={1}>International</option>
            <option value={2}>Local</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          {logoPreview && <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain bg-gray-50 rounded-lg border border-gray-200 mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setLogoFile(f); setLogoPreview(URL.createObjectURL(f));
          }} className="text-sm" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploading}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-colors">
            {saveMutation.isPending || uploading ? "Saving..." : "Save"}
          </button>
          <Link href={dashboardAppRoutes.partners} className="px-6 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
