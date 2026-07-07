"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";

function SimpleTable({ title, queryKey, endpoint, labelField, onAdd, onEdit, onRequestDelete }: any) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api.get(endpoint).then((r) => r.data.data),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button onClick={onAdd} className="flex items-center gap-1 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {isLoading ? (
        <div className="p-4 text-gray-400 text-sm">Loading...</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data?.map((item: any) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-800">{item[labelField]}</span>
              <div className="flex gap-2">
                <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRequestDelete({ ...item, _label: item[labelField], _endpoint: endpoint, _queryKey: queryKey })}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
          {!data?.length && <li className="px-4 py-4 text-sm text-gray-400">None yet</li>}
        </ul>
      )}
    </div>
  );
}

function Modal({ title, value, onChange, onSave, onClose, loading }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={loading} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-60">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaxonomyPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ type: string; endpoint: string; queryKey: string; labelField: string; item?: any } | null>(null);
  const [inputValue, setInputValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modal) return;
      const payload: any = { [modal.labelField]: inputValue };
      if (modal.item) {
        return api.put(`${modal.endpoint}/${modal.item.id}`, payload);
      }
      return api.post(modal.endpoint, payload);
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: [modal!.queryKey] });
      setModal(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
    useConfirmDelete<any>((item) => {
      api.delete(`${item._endpoint}/${item.id}`)
        .then(() => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: [item._queryKey] }); })
        .catch(() => toast.error("Failed to delete"));
    });

  function openAdd(type: string, endpoint: string, queryKey: string, labelField: string) {
    setInputValue("");
    setModal({ type, endpoint, queryKey, labelField });
  }

  function openEdit(type: string, endpoint: string, queryKey: string, labelField: string, item: any) {
    setInputValue(item[labelField]);
    setModal({ type, endpoint, queryKey, labelField, item });
  }

  return (
    <div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete item?"
        description={`"${pendingDelete?._label}" will be permanently deleted.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Taxonomy</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SimpleTable
          title="Categories" queryKey="categories" endpoint="/items/category_product" labelField="name"
          onAdd={() => openAdd("Category", "/items/category_product", "categories", "name")}
          onEdit={(item: any) => openEdit("Category", "/items/category_product", "categories", "name", item)}
          onRequestDelete={requestDelete}
        />
        <SimpleTable
          title="Sub Categories" queryKey="sub-categories" endpoint="/items/sub_category" labelField="subCategory"
          onAdd={() => openAdd("Sub Category", "/items/sub_category", "sub-categories", "subCategory")}
          onEdit={(item: any) => openEdit("Sub Category", "/items/sub_category", "sub-categories", "subCategory", item)}
          onRequestDelete={requestDelete}
        />
        <SimpleTable
          title="Brands" queryKey="brands" endpoint="/items/brand" labelField="brandName"
          onAdd={() => openAdd("Brand", "/items/brand", "brands", "brandName")}
          onEdit={(item: any) => openEdit("Brand", "/items/brand", "brands", "brandName", item)}
          onRequestDelete={requestDelete}
        />
      </div>

      {modal && (
        <Modal
          title={`${modal.item ? "Edit" : "Add"} ${modal.type}`}
          value={inputValue}
          onChange={setInputValue}
          onSave={() => saveMutation.mutate()}
          onClose={() => setModal(null)}
          loading={saveMutation.isPending}
        />
      )}
    </div>
  );
}
