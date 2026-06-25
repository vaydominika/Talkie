"use client";

import { useEffect, useState, useTransition } from "react";
import { VocabularyFlashcards } from "@/components/vocabulary-flashcards";
import { Button } from "@/components/ui/button";
import { importVocabularyAction, toggleGroupMemberImportsAction } from "@/app/app/groups/actions";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  translations: { text: string }[];
  japanese: { kana: string } | null;
  language: { id: string; name: string };
};

type Member = {
  id: string;
  role: string;
  joinedAt: Date;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
};

type Language = {
  id: string;
  name: string;
};

type AddWordAction = (formData: FormData) => Promise<void>;

export function GroupTabs({
  groupId,
  words,
  members,
  languages,
  allowMemberImports,
  currentUserRole,
  addWordAction,
}: {
  groupId: string;
  words: Word[];
  members: Member[];
  languages: Language[];
  allowMemberImports: boolean;
  currentUserRole: string;
  addWordAction: AddWordAction;
}) {
  const [tab, setTab] = useState("vocabulary");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localVocabIds, setLocalVocabIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canImport = isOwnerOrAdmin || allowMemberImports;

  // Load selected flashcards from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`talkie-group-${groupId}-flashcards`);
    if (stored === null) {
      // Default to select all group words
      const allWordIds = words.map((word) => word.id);
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify(allWordIds));
      setSelected(new Set(allWordIds));
    } else {
      setSelected(new Set(JSON.parse(stored)));
    }

    // Load user's active vocabulary from local storage
    try {
      const activeStored = localStorage.getItem("talkie-vocabulary-flashcards");
      if (activeStored) {
        const parsed = JSON.parse(activeStored);
        if (Array.isArray(parsed)) {
          setLocalVocabIds(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [words, groupId]);

  const toggleFlashcard = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await addWordAction(formData);
    setAdding(false);
  };

  const handleManualImport = () => {
    if (localVocabIds.length === 0) return;
    const formData = new FormData();
    formData.append("groupId", groupId);
    formData.append("importedVocabIds", JSON.stringify(localVocabIds));

    startTransition(async () => {
      try {
        await importVocabularyAction(formData);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to import vocabulary");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs list */}
      <div className="flex flex-wrap items-center justify-between border-b border-muted gap-4">
        <div className="flex">
          {[
            { id: "vocabulary", label: "Vocabulary" },
            { id: "flashcards", label: "Flashcards" },
            { id: "members", label: "Members" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`mr-6 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                tab === item.id ? "border-rose-600 text-rose-700 font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Group Owner Settings */}
        {isOwnerOrAdmin && tab !== "flashcards" && (
          <form className="pb-3 flex items-center gap-2 text-xs">
            <input type="hidden" name="groupId" value={groupId} />
            <input
              type="checkbox"
              id="allowMemberImports"
              name="allowMemberImports"
              defaultChecked={allowMemberImports}
              onChange={(e) => {
                const formData = new FormData();
                formData.append("groupId", groupId);
                if (e.target.checked) {
                  formData.append("allowMemberImports", "on");
                }
                toggleGroupMemberImportsAction(formData);
              }}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="allowMemberImports" className="font-medium text-muted-foreground select-none cursor-pointer">
              Allow members to import flashcards
            </label>
          </form>
        )}
      </div>

      {/* Vocabulary tab */}
      {tab === "vocabulary" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h3 className="text-lg font-medium">Shared Vocabulary ({words.length})</h3>
            <div className="flex items-center gap-2">
              {canImport && localVocabIds.length > 0 && (
                <Button
                  onClick={handleManualImport}
                  disabled={isPending}
                  variant="outline"
                  className="border-rose-200 hover:bg-rose-50/50 hover:text-rose-700 text-rose-600 text-sm font-medium"
                >
                  {isPending ? "Importing..." : `Import Active Flashcards (${localVocabIds.length})`}
                </Button>
              )}
              <Button onClick={() => setAdding(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
                + Add Word
              </Button>
            </div>
          </div>

          {words.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10">
              <p className="text-muted-foreground">No vocabulary words have been added to this group yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to share a word!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3">Word</th>
                    <th className="p-3">Meaning</th>
                    <th className="p-3">Language</th>
                    <th className="p-3 text-right">Flashcard</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word) => (
                    <tr key={word.id} className="border-t hover:bg-muted/10">
                      <td className="p-3 font-medium">
                        {word.displayForm}
                        {word.japanese?.kana && <span className="ml-2 text-xs text-muted-foreground font-normal">({word.japanese.kana})</span>}
                      </td>
                      <td className="p-3">{word.translations.map((t) => t.text).join(", ") || word.definition}</td>
                      <td className="p-3 text-xs text-muted-foreground">{word.language.name}</td>
                      <td className="p-3 text-right">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selected.has(word.id)}
                            onChange={() => toggleFlashcard(word.id)}
                            className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs text-muted-foreground">Practice</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Flashcards tab */}
      {tab === "flashcards" && (
        <div className="space-y-4">
          <VocabularyFlashcards words={words} selectedIds={selected} />
        </div>
      )}

      {/* Members tab */}
      {tab === "members" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Group Members ({members.length})</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t">
                    <td className="p-3 font-medium">
                      {member.user.name || member.user.email}
                      {member.user.name && <span className="ml-2 text-xs text-muted-foreground font-normal">({member.user.email})</span>}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        member.role === "OWNER"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : member.role === "ADMIN"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-stone-50 text-stone-700 border border-stone-200"
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {adding && (
        <div role="dialog" aria-modal="true" aria-label="Add vocabulary" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleAddSubmit} className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Add vocabulary</h2>
                <p className="text-sm text-muted-foreground">Share a word with the study group.</p>
              </div>
              <button type="button" onClick={() => setAdding(false)} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
                Close
              </button>
            </div>

            <div>
              <label htmlFor="languageId" className="block text-sm font-medium text-muted-foreground">
                Language
              </label>
              <select
                id="languageId"
                name="languageId"
                required
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
              >
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="word" className="block text-sm font-medium text-muted-foreground">
                Word
              </label>
              <input
                id="word"
                name="word"
                required
                autoFocus
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label htmlFor="meaning" className="block text-sm font-medium text-muted-foreground">
                Meaning
              </label>
              <input
                id="meaning"
                name="meaning"
                required
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                Share word
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
