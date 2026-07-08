"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown text (GitHub-flavored) with app-scoped styling.
 * Styling lives in `.markdown-body` in globals.css. Pass `sinhala-text`
 * (or any extra class) via `className` for the Sinhala pane.
 */
export function MarkdownView({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
