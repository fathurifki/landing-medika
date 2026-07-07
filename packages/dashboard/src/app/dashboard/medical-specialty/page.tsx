"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { dashboardAppRoutes } from "@/lib/routes";

export default function MedicalSpecialtyPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["medical-specialty"],
    queryFn: () => api.get("/items/medical_specialty").then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/medical_specialty/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["medical-specialty"] }); },
    onError: () => toast.error("Failed to delete"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((item) => deleteMutation.mutate(item.id));

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete specialty?"
        description={`"${pendingDelete?.title}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Specialty</h1>
        <Link href={`${dashboardAppRoutes.medicalSpecialty}/new`}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Add Specialty
        </Link>
      </div>
      {isLoading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-50 relative flex items-center justify-center">
                {item.image ? (
                  <Image
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : <div className="text-gray-300 text-xs">No image</div>}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                {item.description && (
                  <SafeHtml
                    as="p"
                    html={item.description}
                    className="text-xs text-gray-500 mt-1 line-clamp-2"
                  />
                )}
                <div className="flex gap-2 mt-3">
                  <Link href={`${dashboardAppRoutes.medicalSpecialty}/${item.id}`} className="flex-1 text-center text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Edit</Link>
                  <button
                    onClick={() => requestDelete(item)}
                    className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!data?.length && <div className="col-span-full text-center text-gray-400 py-16">No specialties yet</div>}
        </div>
      )}
    </div>
  );
}
