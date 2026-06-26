"use client";

import { useState } from "react";
import { AppModal } from "@/components/app-modal";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui/button";

export type VocabularyTableWord = {
  id: string;
  displayForm: string;
  definition: string;
  pronunciation?: string | null;
  translations: { text: string }[];
  japanese?: { kana: string } | null;
};

type Action = (formData: FormData) => void | Promise<void>;

export function VocabularyTable({
  title,
  subtitle,
  words,
  languageId,
  groupId,
  selectedIds,
  onToggleFlashcard,
  onSetFlashcards,
  addAction,
  bulkAddAction,
  updateAction,
  deleteAction,
  syncControls,
}: {
  title: string;
  subtitle?: string;
  words: VocabularyTableWord[];
  languageId: string;
  groupId?: string;
  selectedIds: Set<string>;
  onToggleFlashcard: (id: string) => void;
  onSetFlashcards: (ids: string[], checked: boolean) => void;
  addAction: Action;
  bulkAddAction?: Action;
  updateAction: Action;
  deleteAction: Action;
  syncControls?: React.ReactNode;
}) {
  const [editing, setEditing] = useState<VocabularyTableWord | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const meaning = (word: VocabularyTableWord) => word.translations.map((translation) => translation.text).join(", ") || word.definition;
  const allSelected = words.length > 0 && words.every((word) => selectedIds.has(word.id));

  const openAdd = () => {
    setEditing(null);
    setMode("basic");
    setOpen(true);
  };

  const openEdit = (word: VocabularyTableWord) => {
    setEditing(word);
    setMode("basic");
    setOpen(true);
  };

  const action = editing ? updateAction : addAction;

  return (
    <section className="animate-panel-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncControls}
          <Button onClick={openAdd} className="bg-rose-600 hover:bg-rose-700 text-white">
            + Add Word
          </Button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center">
          <p className="text-muted-foreground">No vocabulary yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Add or copy words to build this list.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">Word</th>
                <th className="p-3">Meaning</th>
                <th className="p-3 text-right">
                  <label className="inline-flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => onSetFlashcards(words.map((word) => word.id), event.target.checked)}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Practice</span>
                  </label>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <tr key={word.id} className="animate-list-in border-t hover:bg-muted/10" style={{ animationDelay: `${index * 25}ms` }}>
                  <td className="p-3 font-medium">
                    {word.displayForm}
                    {word.pronunciation && <span className="ml-2 text-xs font-normal text-muted-foreground">[{word.pronunciation}]</span>}
                    {word.japanese?.kana && <span className="ml-2 text-xs font-normal text-muted-foreground">({word.japanese.kana})</span>}
                  </td>
                  <td className="p-3">{meaning(word)}</td>
                  <td className="p-3 text-right">
                    <label className="inline-flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(word.id)}
                        onChange={() => onToggleFlashcard(word.id)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs text-muted-foreground">Practice</span>
                    </label>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => openEdit(word)} className="h-8 px-3">
                        Edit
                      </Button>
                      <ConfirmActionForm
                        action={deleteAction}
                        fields={{ wordId: word.id, ...(groupId ? { groupId } : {}) }}
                        title="Delete word"
                        description={`Delete "${word.displayForm}" from this vocabulary list?`}
                        confirmLabel="Delete word"
                        buttonClassName="h-8 rounded-md border px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </ConfirmActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <AppModal
          title={editing ? "Edit vocabulary" : "Add vocabulary"}
          description={editing ? "Update this word." : "Add a word to this list."}
          onClose={() => setOpen(false)}
        >
          {!editing && bulkAddAction && (
            <div className="mb-4 inline-flex rounded-md border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setMode("basic")}
                className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "basic" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setMode("advanced")}
                className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "advanced" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Advanced JSON
              </button>
            </div>
          )}

          {mode === "advanced" && !editing && bulkAddAction ? (
            <form action={bulkAddAction} onSubmit={() => setOpen(false)} className="space-y-4">
              <input type="hidden" name="languageId" value={languageId} />
              {groupId && <input type="hidden" name="groupId" value={groupId} />}
              <label className="block text-sm font-medium">
                Vocabulary JSON
                <textarea
                  name="vocabularyJson"
                  required
                  rows={10}
                  spellCheck={false}
                  defaultValue={'[\n  { "word": "Haus", "pronunciation": "hows", "meaning": "house" },\n  { "word": "lernen", "pronunciation": "LEHR-nen", "meaning": "to learn" }\n]'}
                  className="mt-1 w-full rounded-md border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>
              <p className="text-xs text-muted-foreground">Use an array of objects. Duplicate words are skipped.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <PendingSubmitButton pendingLabel="Adding..." className="h-10 rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700">
                  Add words
                </PendingSubmitButton>
              </div>
            </form>
          ) : (
            <form action={action} onSubmit={() => setOpen(false)} className="space-y-4">
              <input type="hidden" name="languageId" value={languageId} />
              {groupId && <input type="hidden" name="groupId" value={groupId} />}
              {editing ? <input type="hidden" name="wordId" value={editing.id} /> : <input type="hidden" name="id" value={crypto.randomUUID()} />}
              <label className="block text-sm font-medium">
                Word
                <input
                  name="word"
                  required
                  autoFocus
                  defaultValue={editing?.displayForm ?? ""}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>
              <label className="block text-sm font-medium">
                Meaning
                <input
                  name="meaning"
                  required
                  defaultValue={editing ? meaning(editing) : ""}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>
              <label className="block text-sm font-medium">
                Pronunciation
                <input
                  name="pronunciation"
                  defaultValue={editing?.pronunciation ?? ""}
                  placeholder="e.g. LEHR-nen"
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>
              {!editing && <input type="hidden" name="addToFlashcards" value="on" />}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <PendingSubmitButton pendingLabel={editing ? "Saving..." : "Adding..."} className="h-10 rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700">
                  {editing ? "Save changes" : "Save word"}
                </PendingSubmitButton>
              </div>
            </form>
          )}
        </AppModal>
      )}
    </section>
  );
}
