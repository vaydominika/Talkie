"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Heading2, Heading3, Image, Italic, Link, List, ListOrdered, Quote, Redo2, Underline, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const toolbarGroups = [
  [
    { command: "formatBlock", value: "h2", label: "Heading 2", icon: Heading2 },
    { command: "formatBlock", value: "h3", label: "Heading 3", icon: Heading3 },
    { command: "formatBlock", value: "blockquote", label: "Quote", icon: Quote },
  ],
  [
    { command: "bold", label: "Bold", icon: Bold },
    { command: "italic", label: "Italic", icon: Italic },
    { command: "underline", label: "Underline", icon: Underline },
  ],
  [
    { command: "insertUnorderedList", label: "Bullet list", icon: List },
    { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  ],
  [
    { command: "justifyLeft", label: "Align left", icon: AlignLeft },
    { command: "justifyCenter", label: "Align center", icon: AlignCenter },
    { command: "justifyRight", label: "Align right", icon: AlignRight },
  ],
  [
    { command: "undo", label: "Undo", icon: Undo2 },
    { command: "redo", label: "Redo", icon: Redo2 },
    { command: "removeFormat", label: "Clear formatting", icon: Eraser },
  ],
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
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);

  const sync = () => {
    if (!inputRef.current || !editorRef.current) return;
    inputRef.current.value = editorRef.current.innerHTML;
    setSourceHtml(editorRef.current.innerHTML);
  };

  const setHtml = (html: string) => {
    if (editorRef.current) editorRef.current.innerHTML = html;
    if (inputRef.current) inputRef.current.value = html;
    setSourceHtml(html);
  };

  useEffect(() => {
    setHtml(initialHtml);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  const run = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    run("createLink", url);
  };

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    run("insertImage", url);
  };

  const toggleSourceMode = () => {
    if (sourceMode) setHtml(sourceHtml);
    else sync();
    setSourceMode((value) => !value);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-2 dark:border-stone-800">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-1 border-r border-stone-200 pr-2 last:border-r-0 dark:border-stone-800">
            {group.map((tool) => {
              const Icon = tool.icon;
              return (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(tool.command, "value" in tool ? tool.value : undefined)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
              );
            })}
          </div>
        ))}
        <button type="button" title="Add link" aria-label="Add link" onMouseDown={(event) => event.preventDefault()} onClick={addLink} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          <Link className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Add image" aria-label="Add image" onMouseDown={(event) => event.preventDefault()} onClick={addImage} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          <Image className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={toggleSourceMode} className="h-8 rounded-md border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          HTML
        </button>
      </div>
      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(event) => {
            setSourceHtml(event.target.value);
            if (inputRef.current) inputRef.current.value = event.target.value;
          }}
          spellCheck={false}
          className="min-h-64 w-full rounded-b-2xl bg-background p-4 font-mono text-sm text-stone-900 outline-none focus:ring-2 focus:ring-rose-300 dark:text-stone-100"
        />
      ) : (
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
          className="prose prose-sm min-h-64 max-w-none rounded-b-2xl p-4 text-stone-900 outline-none focus:ring-2 focus:ring-rose-300 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] dark:prose-invert dark:text-stone-100"
        />
      )}
    </div>
  );
}
