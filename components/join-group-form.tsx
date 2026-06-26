"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { GroupPreview } from "@/components/group-modal-actions";

type JoinGroupAction = (formData: FormData) => Promise<void>;
type PreviewAction = (formData: FormData) => Promise<GroupPreview>;
type PersonalVocabulary = { id: string; displayForm: string; languageId: string; translations: { text: string }[] };

export function JoinGroupForm({
  joinGroupAction,
  previewGroupInviteAction,
  personalVocabulary,
}: {
  joinGroupAction: JoinGroupAction;
  previewGroupInviteAction: PreviewAction;
  personalVocabulary: PersonalVocabulary[];
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [importLanguageIds, setImportLanguageIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("talkie-vocabulary-flashcards");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSelectedFlashcardIds(parsed);
    } catch (readError) {
      console.error("Failed to read vocabulary flashcards from localStorage", readError);
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
    if (!preview) return;
    setImportLanguageIds(new Set(preview.languages.filter((language) => vocabByLanguage.has(language.id)).map((language) => language.id)));
  }, [preview, vocabByLanguage]);

  const importedVocabByLanguage = preview?.allowMemberImports
    ? Object.fromEntries([...importLanguageIds].map((languageId) => [languageId, (vocabByLanguage.get(languageId) ?? []).map((word) => word.id)]))
    : {};

  const checkGroup = () => {
    const formData = new FormData();
    formData.append("inviteCode", inviteCode);
    setError("");
    startTransition(async () => {
      try {
        const result = await previewGroupInviteAction(formData);
        setPreview(result);
      } catch (previewError) {
        setPreview(null);
        setError(previewError instanceof Error ? previewError.message : "Could not preview that group.");
      }
    });
  };

  const toggleImport = (languageId: string) => {
    setImportLanguageIds((current) => {
      const next = new Set(current);
      next.has(languageId) ? next.delete(languageId) : next.add(languageId);
      return next;
    });
  };

  return (
    <form action={joinGroupAction} className="space-y-5">
      <input type="hidden" name="importedVocabByLanguage" value={JSON.stringify(importedVocabByLanguage)} />

      <div className="flex gap-2">
        <label className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
          Invite code
          <input
            type="text"
            name="inviteCode"
            value={inviteCode}
            onChange={(event) => {
              setInviteCode(event.target.value.toUpperCase());
              setPreview(null);
              setError("");
            }}
            placeholder="AB12XY"
            required
            maxLength={10}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-400"
          />
        </label>
        <Button type="button" variant="outline" onClick={checkGroup} disabled={!inviteCode.trim() || pending} className="mt-6">
          {pending ? "Checking..." : "Check group"}
        </Button>
      </div>

      {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {preview && (
        <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
          <div>
            <p className="font-semibold">{preview.name}</p>
            {preview.description && <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>}
            {preview.alreadyMember && <p className="mt-2 text-xs font-medium text-rose-700">You are already a member.</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Group languages</p>
            {preview.languages.length === 0 ? (
              <p className="text-sm text-muted-foreground">This group has no languages yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {preview.languages.map((language) => (
                  <div key={language.id} className="rounded-md border bg-background p-3 text-sm">
                    <p className="font-medium">{language.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {language.nativeName} / {language.wordCount} word{language.wordCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {preview.allowMemberImports ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Import my selected flashcards</p>
              {preview.languages.some((language) => vocabByLanguage.has(language.id)) ? (
                preview.languages
                  .filter((language) => vocabByLanguage.has(language.id))
                  .map((language) => {
                    const words = vocabByLanguage.get(language.id) ?? [];
                    return (
                      <label key={language.id} className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={importLanguageIds.has(language.id)}
                          onChange={() => toggleImport(language.id)}
                          className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
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
                  })
              ) : (
                <p className="text-sm text-muted-foreground">No selected flashcards match this group&apos;s languages.</p>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
              The owner does not allow members to import flashcards into this group.
            </p>
          )}
        </section>
      )}

      <PendingSubmitButton
        disabled={!preview || pending}
        pendingLabel="Joining..."
        className="h-10 w-full rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700"
      >
        Join group
      </PendingSubmitButton>
    </form>
  );
}
