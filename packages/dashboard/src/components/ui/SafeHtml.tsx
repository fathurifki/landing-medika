import { sanitizeHtml } from "@/lib/sanitize";

type SafeHtmlProps = {
  html: string | null | undefined;
  className?: string;
  as?: "div" | "p" | "span";
};

export function SafeHtml({ html, className, as: Tag = "div" }: SafeHtmlProps) {
  const safe = sanitizeHtml(html);
  if (!safe) return null;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
