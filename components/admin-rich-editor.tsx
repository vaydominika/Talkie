"use client";

import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";

export function AdminRichEditor({
  name,
  initialHtml = "",
  placeholder = "Write the lesson text here...",
}: {
  name: string;
  initialHtml?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
      ImageExtension.configure({
        allowBase64: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        "aria-label": placeholder,
        class:
          "prose prose-sm min-h-64 max-w-none rounded-b-2xl p-4 text-stone-900 outline-none focus:ring-2 focus:ring-rose-300 dark:prose-invert dark:text-stone-100",
      },
    },
    onUpdate: ({ editor }) => {
      const nextHtml = editor.getHTML();
      setHtml(nextHtml);
      setSourceHtml(nextHtml);
    },
  });

  useEffect(() => {
    setHtml(initialHtml);
    setSourceHtml(initialHtml);
    if (editor && editor.getHTML() !== initialHtml) {
      editor.commands.setContent(initialHtml || "", { emitUpdate: false });
    }
  }, [editor, initialHtml]);

  const toggleSourceMode = () => {
    if (sourceMode && editor) {
      editor.commands.setContent(sourceHtml || "", { emitUpdate: false });
      setHtml(sourceHtml);
    } else {
      const nextHtml = editor?.getHTML() ?? html;
      setSourceHtml(nextHtml);
      setHtml(nextHtml);
    }
    setSourceMode((value) => !value);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <input type="hidden" name={name} value={sourceMode ? sourceHtml : html} />
      <EditorToolbar editor={editor} onToggleSourceMode={toggleSourceMode} sourceMode={sourceMode} />

      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(event) => {
            setSourceHtml(event.target.value);
            setHtml(event.target.value);
          }}
          spellCheck={false}
          className="min-h-64 w-full rounded-b-2xl bg-background p-4 font-mono text-sm text-stone-900 outline-none focus:ring-2 focus:ring-rose-300 dark:text-stone-100"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}

function EditorToolbar({
  editor,
  onToggleSourceMode,
  sourceMode,
}: {
  editor: Editor | null;
  onToggleSourceMode: () => void;
  sourceMode: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-2 dark:border-stone-800">
      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive("heading", { level: 2 })} label="Heading 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("heading", { level: 3 })} label="Heading 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("blockquote")} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive("bold")} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("italic")} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("underline")} label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <Underline className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive("bulletList")} label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("orderedList")} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton active={editor?.isActive({ textAlign: "left" })} label="Align left" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "center" })} label="Align center" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "right" })} label="Align right" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton label="Add link" onClick={() => addLink(editor)}>
          <Link className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Add image" onClick={() => addImage(editor)}>
          <ImageIcon className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>
          <Eraser className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <button
        type="button"
        onClick={onToggleSourceMode}
        className={`h-8 rounded-md border border-stone-200 px-3 text-xs font-semibold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 ${
          sourceMode ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950" : "text-stone-700 dark:text-stone-200"
        }`}
      >
        HTML
      </button>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 border-r border-stone-200 pr-2 last:border-r-0 dark:border-stone-800">{children}</div>;
}

function ToolbarButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 ${
        active ? "bg-stone-100 dark:bg-stone-800" : ""
      }`}
    >
      {children}
    </button>
  );
}

function addLink(editor: Editor | null) {
  if (!editor) return;
  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", previousUrl ?? "");
  if (url === null) return;
  if (!url) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function addImage(editor: Editor | null) {
  if (!editor) return;
  const url = window.prompt("Image URL");
  if (!url) return;
  editor.chain().focus().setImage({ src: url }).run();
}
