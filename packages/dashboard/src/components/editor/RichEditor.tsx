"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const TOOLBAR = [
  { label: "B",    title: "Bold",         action: (e: any) => e?.chain().focus().toggleBold().run(),                     active: (e: any) => e?.isActive("bold") },
  { label: "I",    title: "Italic",       action: (e: any) => e?.chain().focus().toggleItalic().run(),                   active: (e: any) => e?.isActive("italic") },
  { label: "H2",   title: "Heading 2",    action: (e: any) => e?.chain().focus().toggleHeading({ level: 2 }).run(),      active: (e: any) => e?.isActive("heading", { level: 2 }) },
  { label: "H3",   title: "Heading 3",    action: (e: any) => e?.chain().focus().toggleHeading({ level: 3 }).run(),      active: (e: any) => e?.isActive("heading", { level: 3 }) },
  { label: "UL",   title: "Bullet List",  action: (e: any) => e?.chain().focus().toggleBulletList().run(),               active: (e: any) => e?.isActive("bulletList") },
  { label: "OL",   title: "Ordered List", action: (e: any) => e?.chain().focus().toggleOrderedList().run(),              active: (e: any) => e?.isActive("orderedList") },
  { label: "Code", title: "Code",         action: (e: any) => e?.chain().focus().toggleCode().run(),                     active: (e: any) => e?.isActive("code") },
  { label: "—",    title: "Divider",      action: (e: any) => e?.chain().focus().setHorizontalRule().run(),              active: () => false },
];

interface RichEditorProps {
  value: string;
  onChange: (v: string) => void;
  minHeight?: string;
}

export function RichEditor({ value, onChange, minHeight = "min-h-48" }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `outline-none p-3 ${minHeight}`,
        style: "color: var(--ink); font-size: 14px; line-height: 1.6; letter-spacing: -0.01em;",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current && value !== "<p></p>") {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
      onFocusCapture={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px var(--accent-blue)";
      }}
      onBlurCapture={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Toolbar */}
      <div
        className="flex gap-1 px-2 py-1.5 flex-wrap"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}
      >
        {TOOLBAR.map(({ label, title, action, active }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={() => action(editor)}
            className="px-2 py-1 text-xs rounded-md font-medium transition-colors"
            style={{
              background: active(editor) ? "var(--ink)" : "transparent",
              color: active(editor) ? "var(--canvas)" : "var(--ink-muted)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!active(editor)) {
                (e.currentTarget as HTMLElement).style.background = "var(--hairline)";
                (e.currentTarget as HTMLElement).style.color = "var(--ink)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active(editor)) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)";
              }
            }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          title="Clear"
          onClick={() => { editor?.chain().focus().clearContent().run(); onChange(""); }}
          className="ml-auto px-2 py-1 text-xs rounded-md transition-colors"
          style={{ color: "var(--ink-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; (e.currentTarget as HTMLElement).style.background = "var(--hairline)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          Clear
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
