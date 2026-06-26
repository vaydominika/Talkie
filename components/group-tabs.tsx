"use client";

import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { VocabularyTable } from "@/components/vocabulary-table";
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
    image: string | null;
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
type RemoveLanguageAction = (formData: FormData) => Promise<void>;
type UpdateWordAction = (formData: FormData) => Promise<void>;
type DeleteWordAction = (formData: FormData) => Promise<void>;
type UpdateMemberRoleAction = (formData: FormData) => Promise<void>;
type RemoveMemberAction = (formData: FormData) => Promise<void>;
type AttemptAction = (formData: FormData) => void | Promise<void>;
type ReviewAttempt = {
  id: string;
  vocabularyEntryId: string;
  displayForm: string;
  correct: boolean;
  createdAt: Date;
};
type SyncCount = {
  languageId: string;
  mineToGroupCount: number;
  groupToMineCount: number;
};

export function GroupTabs({
  groupId,
  words,
  members,
  groupLanguages,
  availableLanguages,
  syncCounts,
  reviewAttempts,
  allowMemberImports,
  currentUserRole,
  currentUserId,
  addWordAction,
  addWordsBulkAction,
  updateWordAction,
  deleteWordAction,
  addLanguageAction,
  removeLanguageAction,
  updateMemberRoleAction,
  removeMemberAction,
  saveAttemptAction,
  resetAttemptsAction,
}: {
  groupId: string;
  words: Word[];
  members: Member[];
  groupLanguages: Language[];
  availableLanguages: Language[];
  syncCounts: SyncCount[];
  reviewAttempts: ReviewAttempt[];
  allowMemberImports: boolean;
  currentUserRole: string;
  currentUserId: string;
  addWordAction: AddWordAction;
  addWordsBulkAction: AddWordAction;
  updateWordAction: UpdateWordAction;
  deleteWordAction: DeleteWordAction;
  addLanguageAction: AddLanguageAction;
  removeLanguageAction: RemoveLanguageAction;
  updateMemberRoleAction: UpdateMemberRoleAction;
  removeMemberAction: RemoveMemberAction;
  saveAttemptAction: AttemptAction;
  resetAttemptsAction: AttemptAction;
}) {
  const [tab, setTab] = useState("vocabulary");
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
  const activeSync = syncCounts.find((item) => item.languageId === activeLanguage?.id);

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

  const setFlashcards = (ids: string[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify([...next]));
      return next;
    });
  };

  const practiceWords = tab === "flashcards" && activeLanguage ? activeWords : words;
  const activeAttempts = activeLanguage ? reviewAttempts.filter((attempt) => activeWords.some((word) => word.id === attempt.vocabularyEntryId)) : reviewAttempts;

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
                  <PendingSubmitButton
                    pendingLabel="Adding..."
                    className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                  >
                    Add Language
                  </PendingSubmitButton>
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
            <div className="space-y-3">
              {isOwnerOrAdmin && (
                <ConfirmActionForm
                  action={removeLanguageAction}
                  fields={{ groupId, languageId: activeLanguage.id }}
                  title="Remove language"
                  description={`Remove ${activeLanguage.name} and its shared words from this group?`}
                  confirmLabel="Remove language"
                  className="flex justify-end"
                  buttonClassName="rounded-md border px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Remove language
                </ConfirmActionForm>
              )}
              <VocabularyTable
                title={`${activeLanguage.name} Vocabulary (${activeWords.length})`}
                subtitle="Shared words stay in this group until copied to your own vocabulary."
                words={activeWords}
                languageId={activeLanguage.id}
                groupId={groupId}
                selectedIds={selected}
                onToggleFlashcard={toggleFlashcard}
                onSetFlashcards={setFlashcards}
                addAction={addWordAction}
                bulkAddAction={addWordsBulkAction}
                updateAction={updateWordAction}
                deleteAction={deleteWordAction}
                syncControls={
                  <div className="flex flex-wrap items-center gap-2">
                    {canImport && (
                      <form action={importProfileVocabularyToGroupAction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="languageId" value={activeLanguage.id} />
                        <PendingSubmitButton
                          disabled={!activeSync || activeSync.mineToGroupCount === 0}
                          pendingLabel="Copying..."
                          className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                        >
                          Copy mine to group
                        </PendingSubmitButton>
                      </form>
                    )}
                    <form action={importGroupVocabularyToProfileAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="languageId" value={activeLanguage.id} />
                      <PendingSubmitButton
                        disabled={!activeSync || activeSync.groupToMineCount === 0}
                        pendingLabel="Copying..."
                        className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                      >
                        Copy group to mine
                      </PendingSubmitButton>
                    </form>
                  </div>
                }
              />
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
          <VocabularyFlashcards
            words={practiceWords}
            selectedIds={selected}
            languageId={activeLanguage?.id}
            groupId={groupId}
            saveAttemptAction={saveAttemptAction}
            resetAttemptsAction={resetAttemptsAction}
          />
          <div className="animate-panel-in grid gap-4 sm:grid-cols-4">
            <Stat label="Days learned" value={new Set(activeAttempts.map((attempt) => new Date(attempt.createdAt).toDateString())).size} />
            <Stat label="New words" value={new Set(activeAttempts.map((attempt) => attempt.vocabularyEntryId)).size} />
            <Stat label="Correct" value={activeAttempts.filter((attempt) => attempt.correct).length} />
            <Stat label="Missed" value={activeAttempts.filter((attempt) => !attempt.correct).length} />
          </div>
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
                        <div className="flex items-center gap-3">
                          <UserAvatar name={member.user.name} email={member.user.email} image={member.user.image} size="sm" />
                          <div>
                            <p>{member.user.name || member.user.email}</p>
                            {member.user.name && <p className="text-xs font-normal text-muted-foreground">{member.user.email}</p>}
                          </div>
                        </div>
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
                              <ConfirmActionForm
                                action={removeMemberAction}
                                fields={{ groupId, memberId: member.id }}
                                title="Remove member"
                                description={`Remove ${member.user.name || member.user.email} from this group?`}
                                confirmLabel="Remove member"
                                buttonClassName="h-8 rounded-md border px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                              >
                                Remove
                              </ConfirmActionForm>
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

    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
