"use client";

import { useEffect, useRef } from "react";

const tools = [
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["insertUnorderedList", "List"],
  ["formatBlock", "Heading"],
] as const;

export function AdminRichEditor({
  name,
  initialHtml = "",
  placeholder = "Write the lesson text here...",
}: {
  name: string;
  initialHtml?: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sync = () => {
    if (inputRef.current && editorRef.current) inputRef.current.value = editorRef.current.innerHTML;
  };

  useEffect(() => {
    if (!editorRef.current || !inputRef.current) return;
    editorRef.current.innerHTML = initialHtml;
    inputRef.current.value = initialHtml;
  }, [initialHtml]);

  const run = (command: string, label: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, label === "Heading" ? "h3" : undefined);
    sync();
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
      <div className="flex flex-wrap gap-2 border-b border-stone-200 p-2 dark:border-stone-800">
        {tools.map(([command, label]) => (
          <button
            key={label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(command, label)}
            className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        className="min-h-40 max-w-none rounded-b-2xl p-4 text-sm leading-7 text-stone-900 outline-none focus:ring-2 focus:ring-rose-300 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] dark:text-stone-100"
      />
    </div>
  );
}
