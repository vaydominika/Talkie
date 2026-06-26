"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type CreateGroupAction = (formData: FormData) => Promise<void>;
type Language = { id: string; code: string; name: string; nativeName: string };
type PersonalVocabulary = { id: string; displayForm: string; languageId: string; translations: { text: string }[] };

export function CreateGroupForm({
  createGroupAction,
  languages,
  personalVocabulary,
}: {
  createGroupAction: CreateGroupAction;
  languages: Language[];
  personalVocabulary: PersonalVocabulary[];
}) {
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<string>>(new Set(languages.map((language) => language.id)));
  const [importLanguageIds, setImportLanguageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("talkie-vocabulary-flashcards");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSelectedFlashcardIds(parsed);
    } catch (error) {
      console.error("Failed to read vocabulary flashcards from localStorage", error);
    }
  }, []);

  const selectedFlashcardSet = useMemo(() => new Set(selectedFlashcardIds), [selectedFlashcardIds]);
  const vocabByLanguage = useMemo(() => {
    const grouped = new Map<string, PersonalVocabulary[]>();
    for (const word of personalVocabulary) {
      if (!selectedFlashcardSet.has(word.id)) continue;
      grouped.set(word.languageId, [...(grouped.get(word.languageId) ?? []), word]);
    }
    return grouped;
  }, [personalVocabulary, selectedFlashcardSet]);

  useEffect(() => {
    setImportLanguageIds(new Set([...vocabByLanguage.keys()]));
  }, [vocabByLanguage]);

  const importedVocabByLanguage = Object.fromEntries(
    [...importLanguageIds]
      .filter((languageId) => selectedLanguageIds.has(languageId))
      .map((languageId) => [languageId, (vocabByLanguage.get(languageId) ?? []).map((word) => word.id)]),
  );

  const toggleSet = (current: Set<string>, id: string) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  return (
    <form action={createGroupAction} className="space-y-5">
      <input type="hidden" name="importedVocabByLanguage" value={JSON.stringify(importedVocabByLanguage)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Group name
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Japanese study circle"
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
          />
        </label>
        <label className="block text-sm font-medium text-muted-foreground">
          Description
          <input
            name="description"
            placeholder="Optional"
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
          />
        </label>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-medium">Languages</p>
        {languages.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Add a language first, then create a group around it.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.map((language) => (
              <label key={language.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  name="languageIds"
                  value={language.id}
                  checked={selectedLanguageIds.has(language.id)}
                  onChange={() => setSelectedLanguageIds((current) => toggleSet(current, language.id))}
                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  <span className="font-medium">{language.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{language.nativeName}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium">Import selected flashcards</p>
        {[...vocabByLanguage.entries()].length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No selected personal flashcards to import.</p>
        ) : (
          <div className="space-y-2">
            {languages
              .filter((language) => vocabByLanguage.has(language.id))
              .map((language) => {
                const words = vocabByLanguage.get(language.id) ?? [];
                const disabled = !selectedLanguageIds.has(language.id);
                return (
                  <label key={language.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={!disabled && importLanguageIds.has(language.id)}
                      disabled={disabled}
                      onChange={() => setImportLanguageIds((current) => toggleSet(current, language.id))}
                      className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500 disabled:opacity-50"
                    />
                    <span>
                      <span className="font-medium">
                        {language.name}: {words.length} word{words.length === 1 ? "" : "s"}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {words.slice(0, 4).map((word) => word.displayForm).join(", ")}
                        {words.length > 4 ? "..." : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
          </div>
        )}
      </section>

      <PendingSubmitButton
        disabled={languages.length === 0}
        pendingLabel="Creating..."
        className="h-10 w-full rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700"
      >
        Create group
      </PendingSubmitButton>
    </form>
  );
}
