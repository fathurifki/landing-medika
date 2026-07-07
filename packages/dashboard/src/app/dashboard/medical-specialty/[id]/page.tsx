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

export default function MedicalSpecialtyFormPage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const isNew = params.id === "new";
  const [form, setForm] = useState({ title: "", description: "", image: null as string | null });
  const [loaded, setLoaded] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["medical-specialty-item", params.id],
    queryFn: () => api.get(`/items/medical_specialty/${params.id}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing && !loaded) {
      setForm({ title: existing.title || "", description: existing.description || "", image: existing.image || null });
      if (existing.image) setImagePreview(getImageUrl(existing.image));
      setLoaded(true);
    }
  }, [existing, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageId = form.image;
      if (imageFile) {
        imageId = await uploadFile(imageFile);
      }
      const payload = { ...form, image: imageId };
      if (isNew) return api.post("/items/medical_specialty", payload);
      return api.put(`/items/medical_specialty/${params.id}`, payload);
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["medical-specialty"] }); router.push(dashboardAppRoutes.medicalSpecialty); },
    onError: () => toast.error("Failed to save"),
  });

  if (!isNew && isLoading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dashboardAppRoutes.medicalSpecialty} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New Specialty" : "Edit Specialty"}</h1>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <RichEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} minHeight="min-h-40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
          {imagePreview && <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="text-sm" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-colors">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <Link href={dashboardAppRoutes.medicalSpecialty} className="px-6 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
