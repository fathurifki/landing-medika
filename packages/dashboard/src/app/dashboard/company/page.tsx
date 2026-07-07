"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Building2, Save, Upload, Images, X, Search, Check } from "lucide-react";

const FILES_BASE =
  process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/files$/, "") ??
  "http://localhost:3001";

// ─── Media Picker Modal ───────────────────────────────────────────────────────
function MediaPickerModal({
  accessToken,
  onSelect,
  onClose,
}: {
  accessToken: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["media-picker", search],
    queryFn: () =>
      fetch(
        `${FILES_BASE}/files?limit=60${search ? `&search=${encodeURIComponent(search)}` : ""}`
      )
        .then((r) => r.json())
        .then((r) => r.data as any[]),
  });

  const images = (data ?? []).filter((f: any) =>
    f.mimeType?.startsWith("image/")
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${FILES_BASE}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      const json = await res.json();
      toast.success("Uploaded");
      refetch();
      onSelect(json.data.id);
      onClose();
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Select from Media Library
          </h2>
          <div className="flex items-center gap-2">
            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity ${uploading ? "opacity-60 pointer-events-none" : ""}`}
              style={{
                background: "var(--surface-2)",
                color: "var(--ink-muted)",
                border: "1px solid var(--hairline)",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload new"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--ink-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-muted)" }}
            />
            <input
              type="text"
              placeholder="Search images…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg animate-pulse"
                  style={{ background: "var(--surface-2)" }}
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <Images
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: "var(--hairline)" }}
              />
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {search ? "No images match your search" : "No images in library yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {images.map((file: any) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelect(file.id);
                    onClose();
                  }}
                  className="group relative aspect-square rounded-lg overflow-hidden transition-all"
                  style={{ border: "2px solid var(--hairline)" }}
                  title={file.originalName}
                >
                  <img
                    src={getImageUrl(file.id)}
                    alt={file.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Image Field ──────────────────────────────────────────────────────────────
function ImageField({
  label,
  fileId,
  accessToken,
  onChange,
  required,
}: {
  label: string;
  fileId?: string | null;
  accessToken: string;
  onChange: (id: string | null) => void;
  required?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      {pickerOpen && (
        <MediaPickerModal
          accessToken={accessToken}
          onSelect={(id) => onChange(id)}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div>
        <label
          className="block text-xs font-medium mb-2"
          style={{ color: "var(--ink-muted)" }}
        >
          {label}{" "}
          {required && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
        <div
          className="rounded-xl p-3 flex flex-col gap-3"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
          }}
        >
          {/* Preview */}
          <div
            className="w-full aspect-video rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              background: "var(--surface-1)",
              border: "1px dashed var(--hairline)",
            }}
          >
            {fileId ? (
              <img
                src={getImageUrl(fileId)}
                alt={label}
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                No image
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--ink)", color: "var(--canvas)" }}
            >
              <Images className="w-3.5 h-3.5" />
              Browse Media
            </button>
            {fileId && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "#ff557722",
                  color: "#ff5577",
                  border: "1px solid #ff557744",
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompanyPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken ?? "";

  const [form, setForm] = useState({
    address: "",
    phoneNumber: "",
    emailAddress: "",
    instagram: "",
    youtube: "",
    linkedin: "",
    logoNavbar: null as string | null,
    logoFooter: null as string | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get("/items/Company").then((r) => r.data.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        address: data.address || "",
        phoneNumber: data.phoneNumber || "",
        emailAddress: data.emailAddress || "",
        instagram: data.instagram || "",
        youtube: data.youtube || "",
        linkedin: data.linkedin || "",
        logoNavbar: data.logoNavbar || null,
        logoFooter: data.logoFooter || null,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put("/items/Company", {
        address: form.address || null,
        phoneNumber: form.phoneNumber || null,
        emailAddress: form.emailAddress || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
        linkedin: form.linkedin || null,
        logoNavbar: form.logoNavbar,
        logoFooter: form.logoFooter,
      }),
    onSuccess: () => {
      toast.success("Company profile saved");
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading…
        </p>
      </div>
    );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
          <Building2 className="w-5 h-5" style={{ color: "var(--ink)" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}
          >
            Company Profile
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            Used in navbar, footer, and contact sections of the landing page
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Address */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--ink-muted)" }}
          >
            Address <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Metland Puri, Grand Boulevard Blok D01 No 3..."
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--ink-muted)" }}
            >
              Phone Number <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value })
              }
              placeholder="+62 21 38924177"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--ink-muted)" }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={form.emailAddress}
              onChange={(e) =>
                setForm({ ...form, emailAddress: e.target.value })
              }
              placeholder="info@apm-medical.co.id"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Logos */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-xl"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)",
          }}
        >
          <ImageField
            label="Logo Navbar"
            fileId={form.logoNavbar}
            accessToken={accessToken}
            onChange={(id) => setForm({ ...form, logoNavbar: id })}
            required
          />
          <ImageField
            label="Logo Footer"
            fileId={form.logoFooter}
            accessToken={accessToken}
            onChange={(id) => setForm({ ...form, logoFooter: id })}
          />
        </div>

        {/* Social Media */}
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Social Media
          </p>
          <div className="space-y-3">
            {[
              {
                key: "instagram",
                label: "Instagram",
                placeholder: "https://www.instagram.com/apm_medical.official/",
              },
              {
                key: "youtube",
                label: "YouTube",
                placeholder: "https://www.youtube.com/channel/...",
              },
              {
                key: "linkedin",
                label: "LinkedIn",
                placeholder:
                  "https://www.linkedin.com/company/anugerah-prima-medika",
              },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="text-xs w-20 shrink-0"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {label}
                </span>
                <input
                  type="url"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--hairline)",
                    color: "var(--ink)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-60 transition-opacity"
            style={{ background: "var(--ink)", color: "var(--canvas)" }}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save Company Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
