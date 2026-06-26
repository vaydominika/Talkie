"use client";

import { useEffect, useMemo, useState } from "react";
import { VocabularyFlashcards } from "@/components/vocabulary-flashcards";
import { Button } from "@/components/ui/button";
import {
  importGroupVocabularyToProfileAction,
  importProfileVocabularyToGroupAction,
  toggleGroupMemberImportsAction,
} from "@/app/app/groups/actions";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  translations: { text: string }[];
  japanese: { kana: string } | null;
  language: { id: string; code: string; name: string; nativeName: string };
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
  code: string;
  name: string;
  nativeName: string;
};

type AddWordAction = (formData: FormData) => Promise<void>;
type AddLanguageAction = (formData: FormData) => Promise<void>;
type UpdateWordAction = (formData: FormData) => Promise<void>;
type DeleteWordAction = (formData: FormData) => Promise<void>;
type UpdateMemberRoleAction = (formData: FormData) => Promise<void>;
type RemoveMemberAction = (formData: FormData) => Promise<void>;

export function GroupTabs({
  groupId,
  words,
  members,
  groupLanguages,
  availableLanguages,
  allowMemberImports,
  currentUserRole,
  currentUserId,
  addWordAction,
  updateWordAction,
  deleteWordAction,
  addLanguageAction,
  updateMemberRoleAction,
  removeMemberAction,
}: {
  groupId: string;
  words: Word[];
  members: Member[];
  groupLanguages: Language[];
  availableLanguages: Language[];
  allowMemberImports: boolean;
  currentUserRole: string;
  currentUserId: string;
  addWordAction: AddWordAction;
  updateWordAction: UpdateWordAction;
  deleteWordAction: DeleteWordAction;
  addLanguageAction: AddLanguageAction;
  updateMemberRoleAction: UpdateMemberRoleAction;
  removeMemberAction: RemoveMemberAction;
}) {
  const [tab, setTab] = useState("vocabulary");
  const [adding, setAdding] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [activeLanguageId, setActiveLanguageId] = useState(groupLanguages[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";
  const canImport = isOwnerOrAdmin || allowMemberImports;

  const wordsByLanguage = useMemo(() => {
    const grouped = new Map<string, Word[]>();
    for (const word of words) {
      grouped.set(word.language.id, [...(grouped.get(word.language.id) ?? []), word]);
    }
    return grouped;
  }, [words]);

  const activeLanguage = activeLanguageId
    ? groupLanguages.find((language) => language.id === activeLanguageId)
    : undefined;
  const activeWords = activeLanguage ? wordsByLanguage.get(activeLanguage.id) ?? [] : [];
  const addableLanguages = availableLanguages.filter(
    (language) => !groupLanguages.some((groupLanguage) => groupLanguage.id === language.id)
  );

  useEffect(() => {
    if (tab === "flashcards" && !activeLanguageId) return;
    if (!activeLanguageId || !groupLanguages.some((language) => language.id === activeLanguageId)) {
      setActiveLanguageId(groupLanguages[0]?.id ?? "");
    }
  }, [activeLanguageId, groupLanguages, tab]);

  useEffect(() => {
    const stored = localStorage.getItem(`talkie-group-${groupId}-flashcards`);
    const allWordIds = words.map((word) => word.id);
    if (stored === null) {
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify(allWordIds));
      setSelected(new Set(allWordIds));
    } else {
      const storedIds = JSON.parse(stored) as string[];
      const next = new Set([...storedIds, ...allWordIds.filter((id) => !storedIds.includes(id))]);
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify([...next]));
      setSelected(next);
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
    if (editingWord) {
      await updateWordAction(formData);
      setEditingWord(null);
    } else {
      await addWordAction(formData);
    }
    setAdding(false);
  };

  const openAddWord = () => {
    setEditingWord(null);
    setAdding(true);
  };

  const openEditWord = (word: Word) => {
    setEditingWord(word);
    setAdding(true);
  };

  const wordMeaning = (word: Word) => word.translations.map((t) => t.text).join(", ") || word.definition;

  const practiceWords = tab === "flashcards" && activeLanguage ? activeWords : words;

  return (
    <div className="space-y-6">
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
                if (e.target.checked) formData.append("allowMemberImports", "on");
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

      {tab === "vocabulary" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium">Group Languages</h3>
              <p className="text-sm text-muted-foreground">Add languages from your Languages page, then share words under each card.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {addableLanguages.length > 0 ? (
                <form action={addLanguageAction} className="flex items-center gap-2">
                  <input type="hidden" name="groupId" value={groupId} />
                  <select
                    name="languageId"
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    defaultValue={addableLanguages[0]?.id}
                  >
                    {addableLanguages.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline">
                    Add Language
                  </Button>
                </form>
              ) : (
                <span className="text-xs text-muted-foreground">Manage more languages on the Languages page to add them here.</span>
              )}
            </div>
          </div>

          {groupLanguages.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10">
              <p className="text-muted-foreground">No languages have been added to this group yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add a language from your Languages page to start a shared deck.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupLanguages.map((language) => {
                const count = wordsByLanguage.get(language.id)?.length ?? 0;
                const isActive = activeLanguage?.id === language.id;
                return (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => setActiveLanguageId(language.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      isActive ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/10" : "hover:border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{language.name}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{language.nativeName}</p>
                      </div>
                      <span className="rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase text-muted-foreground">
                        {language.code}
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {count} shared word{count === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {activeLanguage && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h3 className="text-lg font-medium">
                  {activeLanguage.name} Vocabulary ({activeWords.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {canImport && (
                    <form action={importProfileVocabularyToGroupAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="languageId" value={activeLanguage.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="border-rose-200 hover:bg-rose-50/50 hover:text-rose-700 text-rose-600 text-sm font-medium"
                      >
                        Import My {activeLanguage.name}
                      </Button>
                    </form>
                  )}
                  <form action={importGroupVocabularyToProfileAction}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="languageId" value={activeLanguage.id} />
                    <Button type="submit" variant="outline" className="text-sm font-medium">
                      Add Group Words to Mine
                    </Button>
                  </form>
                  <Button onClick={openAddWord} className="bg-rose-600 hover:bg-rose-700 text-white">
                    + Add Word
                  </Button>
                </div>
              </div>

              {activeWords.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10">
                  <p className="text-muted-foreground">No {activeLanguage.name} words have been added yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Share the first word for this language card.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="p-3">Word</th>
                        <th className="p-3">Meaning</th>
                        <th className="p-3 text-right">Flashcard</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWords.map((word) => (
                        <tr key={word.id} className="border-t hover:bg-muted/10">
                          <td className="p-3 font-medium">
                            {word.displayForm}
                            {word.japanese?.kana && <span className="ml-2 text-xs text-muted-foreground font-normal">({word.japanese.kana})</span>}
                          </td>
                          <td className="p-3">{wordMeaning(word)}</td>
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
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => openEditWord(word)} className="h-8 px-3">
                                Edit
                              </Button>
                              <form
                                action={deleteWordAction}
                                onSubmit={(event) => {
                                  if (!confirm(`Delete "${word.displayForm}" from this group?`)) event.preventDefault();
                                }}
                              >
                                <input type="hidden" name="groupId" value={groupId} />
                                <input type="hidden" name="wordId" value={word.id} />
                                <Button type="submit" variant="outline" className="h-8 px-3 text-rose-700 hover:bg-rose-50">
                                  Delete
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "flashcards" && (
        <div className="space-y-4">
          {groupLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveLanguageId("")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  !activeLanguage ? "border-rose-600 bg-rose-600 text-white" : "hover:bg-muted"
                }`}
              >
                All Languages
              </button>
              {groupLanguages.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => setActiveLanguageId(language.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    activeLanguage?.id === language.id ? "border-rose-600 bg-rose-600 text-white" : "hover:bg-muted"
                  }`}
                >
                  {language.name}
                </button>
              ))}
            </div>
          )}
          <VocabularyFlashcards words={practiceWords} selectedIds={selected} />
        </div>
      )}

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
                  {isOwner && <th className="p-3 text-right">Manage</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const canManageMember = isOwner && member.role !== "OWNER" && member.userId !== currentUserId;
                  return (
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
                      {isOwner && (
                        <td className="p-3">
                          {canManageMember ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <form action={updateMemberRoleAction} className="flex items-center gap-2">
                                <input type="hidden" name="groupId" value={groupId} />
                                <input type="hidden" name="memberId" value={member.id} />
                                <select
                                  name="role"
                                  defaultValue={member.role}
                                  className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                                >
                                  <option value="MEMBER">Member</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                                <Button type="submit" variant="outline" className="h-8 px-3">
                                  Save
                                </Button>
                              </form>
                              <form
                                action={removeMemberAction}
                                onSubmit={(event) => {
                                  const label = member.user.name || member.user.email;
                                  if (!confirm(`Remove ${label} from this group?`)) event.preventDefault();
                                }}
                              >
                                <input type="hidden" name="groupId" value={groupId} />
                                <input type="hidden" name="memberId" value={member.id} />
                                <Button type="submit" variant="outline" className="h-8 px-3 text-rose-700 hover:bg-rose-50">
                                  Remove
                                </Button>
                              </form>
                            </div>
                          ) : (
                            <p className="text-right text-xs text-muted-foreground">Owner</p>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adding && activeLanguage && (
        <div role="dialog" aria-modal="true" aria-label="Add vocabulary" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleAddSubmit} className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="languageId" value={activeLanguage.id} />
            {editingWord && <input type="hidden" name="wordId" value={editingWord.id} />}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingWord ? "Edit" : "Add"} {activeLanguage.name} vocabulary
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingWord ? "Update this shared word." : "Share a word with this language card."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingWord(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
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
                defaultValue={editingWord?.displayForm ?? ""}
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
                defaultValue={editingWord ? wordMeaning(editingWord) : ""}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  setEditingWord(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                {editingWord ? "Save changes" : "Share word"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
