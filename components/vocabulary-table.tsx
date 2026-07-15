"use client";

import { useState } from "react";
import { AppModal } from "@/components/app-modal";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
  speechLocale,
  speechVoiceName,
  speechProvider,
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
  speechLocale?: string | null;
  speechVoiceName?: string | null;
  speechProvider?: string | null;
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncControls}
          <Button onClick={openAdd} className="bg-primary hover:bg-primary text-primary-foreground">
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
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted text-left">
              <TableRow>
                <TableHead className="p-3">Word</TableHead>
                <TableHead className="p-3">Meaning</TableHead>
                <TableHead className="p-3 text-right">
                  <label className="inline-flex cursor-pointer select-none items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => onSetFlashcards(words.map((word) => word.id), checked===true)}
                    />
                    <span>Practice</span>
                  </label>
                </TableHead>
                <TableHead className="p-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map((word, index) => (
                <TableRow key={word.id} className="border-t hover:bg-muted/10" style={{ animationDelay: `${index * 25}ms` }}>
                  <TableCell className="p-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {word.displayForm}
                        {word.pronunciation && <span className="ml-2 text-xs font-normal text-muted-foreground">[{word.pronunciation}]</span>}
                        {word.japanese?.kana && <span className="ml-2 text-xs font-normal text-muted-foreground">({word.japanese.kana})</span>}
                      </span>
                      <SpeakButton text={word.displayForm} locale={speechLocale} voiceName={speechVoiceName} provider={speechProvider} />
                    </span>
                  </TableCell>
                  <TableCell className="p-3">{meaning(word)}</TableCell>
                  <TableCell className="p-3 text-right">
                    <label className="inline-flex cursor-pointer select-none items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(word.id)}
                        onCheckedChange={() => onToggleFlashcard(word.id)}
                      />
                      <span className="text-xs text-muted-foreground">Practice</span>
                    </label>
                  </TableCell>
                  <TableCell className="p-3">
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
                        buttonClassName="h-8 rounded-md border px-3 text-sm font-medium text-foreground hover:bg-accent/30"
                      >
                        Delete
                      </ConfirmActionForm>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <Button
                type="button"
                onClick={() => setMode("basic")}
                variant={mode === "basic" ? "secondary" : "ghost"}
                size="sm"
              >
                Basic
              </Button>
              <Button
                type="button"
                onClick={() => setMode("advanced")}
                variant={mode === "advanced" ? "secondary" : "ghost"}
                size="sm"
              >
                Advanced JSON
              </Button>
            </div>
          )}

          {mode === "advanced" && !editing && bulkAddAction ? (
            <form action={bulkAddAction} onSubmit={() => setOpen(false)} className="space-y-4">
              <input type="hidden" name="languageId" value={languageId} />
              {groupId && <input type="hidden" name="groupId" value={groupId} />}
              <Label className="block text-sm font-medium">
                Vocabulary JSON
                <Textarea
                  name="vocabularyJson"
                  required
                  rows={10}
                  spellCheck={false}
                  defaultValue={'[\n  { "word": "Haus", "pronunciation": "hows", "meaning": "house" },\n  { "word": "lernen", "pronunciation": "LEHR-nen", "meaning": "to learn" }\n]'}
                  className="mt-1 min-h-56 font-mono text-sm"
                />
              </Label>
              <p className="text-xs text-muted-foreground">Use an array of objects. Duplicate words are skipped.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <PendingSubmitButton pendingLabel="Adding..." className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
                <Input
                  name="word"
                  required
                  autoFocus
                  defaultValue={editing?.displayForm ?? ""}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Meaning
                <Input
                  name="meaning"
                  required
                  defaultValue={editing ? meaning(editing) : ""}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Pronunciation
                <Input
                  name="pronunciation"
                  defaultValue={editing?.pronunciation ?? ""}
                  placeholder="e.g. LEHR-nen"
                  className="mt-1"
                />
              </label>
              {!editing && <input type="hidden" name="addToFlashcards" value="on" />}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <PendingSubmitButton pendingLabel={editing ? "Saving..." : "Adding..."} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
