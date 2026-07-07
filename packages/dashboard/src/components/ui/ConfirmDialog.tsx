"use client";

import { useEffect, useRef } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when opened
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
          style={{ background: danger ? "#ff557722" : "var(--surface-2)" }}
        >
          {danger
            ? <Trash2 className="w-5 h-5" style={{ color: "#ff5577" }} />
            : <AlertTriangle className="w-5 h-5" style={{ color: "var(--ink-muted)" }} />
          }
        </div>

        {/* Content */}
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--hairline)" }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: danger ? "#ff5577" : "var(--ink)",
              color: "white",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
