"use client";

import dynamic from "next/dynamic";

function EditorSkeleton() {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", minHeight: "12rem" }}
    />
  );
}

// Tiptap + ProseMirror are only needed once someone opens a form with a rich
// text field — dynamically import so blog/catalog/medical-specialty list and
// edit routes don't ship that bundle on every page load.
export const RichEditor = dynamic(
  () => import("./RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: EditorSkeleton },
);
