"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api, getImageUrl, uploadFile } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { RichEditor } from "@/components/editor/LazyRichEditor";
import { dashboardAppRoutes } from "@/lib/routes";

export default function EventTypeFormPage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const isNew = params.id === "new";

  const [form, setForm] = useState({ eventName: "", nameEvents: "", slug: "", description: "", eventImage: null as string | null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ id?: number; eventImage?: string | null }>>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["event-type", params.id],
    queryFn: () => api.get(`/items/event_types/${params.id}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  const { data: gallery } = useQuery({
    queryKey: ["events-gallery", params.id],
    queryFn: () => api.get(`/items/Events?filter=${JSON.stringify({ medical_events: { _eq: Number(params.id) } })}`).then((r) => r.data.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setForm({ eventName: existing.eventName || "", nameEvents: existing.nameEvents || "", slug: existing.slug || "", description: existing.description || "", eventImage: existing.eventImage || null });
      if (existing.eventImage) setImagePreview(getImageUrl(existing.eventImage));
    }
  }, [existing]);

  useEffect(() => { if (gallery) setGalleryImages(gallery); }, [gallery]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageId = form.eventImage;
      if (imageFile) {
        imageId = await uploadFile(imageFile);
      }
      const payload = { ...form, eventImage: imageId };
      if (isNew) return api.post("/items/event_types", payload);
      return api.put(`/items/event_types/${params.id}`, payload);
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["event-types"] }); router.push(dashboardAppRoutes.events); },
    onError: () => toast.error("Failed to save"),
  });

  async function addGalleryImage(file: File) {
    setUploadingGallery(true);
    try {
      const fileId = await uploadFile(file);
      await api.post("/items/Events", { eventImage: fileId, medicalEvents: Number(params.id) });
      qc.invalidateQueries({ queryKey: ["events-gallery", params.id] });
      toast.success("Image added");
    } catch { toast.error("Failed to add image"); }
    finally { setUploadingGallery(false); }
  }

  async function removeGalleryImage(id: number) {
    await api.delete(`/items/Events/${id}`);
    qc.invalidateQueries({ queryKey: ["events-gallery", params.id] });
    toast.success("Image removed");
  }

  if (!isNew && isLoading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dashboardAppRoutes.events} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New Event" : "Edit Event"}</h1>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name (internal) *</label>
            <input type="text" value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input type="text" value={form.nameEvents} onChange={(e) => setForm({ ...form, nameEvents: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <RichEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
          {imagePreview && <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-cover rounded-lg border border-gray-200 mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="text-sm" />
        </div>

        {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Gallery</label>
              <label className={`flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 ${uploadingGallery ? "opacity-60 pointer-events-none" : ""}`}>
                <Plus className="w-3 h-3" /> {uploadingGallery ? "Uploading..." : "Add image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addGalleryImage(f); }} />
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {galleryImages?.map((img: any) => (
                <div key={img.id} className="relative group aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  <img src={getImageUrl(img.eventImage)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeGalleryImage(img.id)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              {!galleryImages?.length && <div className="col-span-full text-xs text-gray-400 py-4">No gallery images yet</div>}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-colors">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <Link href={dashboardAppRoutes.events} className="px-6 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
