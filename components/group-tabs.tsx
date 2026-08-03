"use client";

import { useEffect, useMemo, useState } from "react";
import { AddFriendButton } from "@/components/add-friend-button";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { VocabularyTable } from "@/components/vocabulary-table";
import { VocabularyFlashcards } from "@/components/vocabulary-flashcards";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams } from "next/navigation";
import {
  importGroupVocabularyToProfileAction,
  importProfileVocabularyToGroupAction,
  toggleGroupMemberImportsAction,
} from "@/app/app/groups/actions";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  pronunciation: string | null;
  translations: { text: string }[];
  japanese: { kana: string } | null;
  language: { id: string; code: string; name: string; nativeName: string; speechProvider: string | null; speechLocale: string | null; speechVoiceName: string | null };
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
    username: string | null;
    friendGroupDiscoverable: boolean;
  };
  friendStatus: "NONE" | "PENDING" | "FRIENDS" | "INCOMING";
};

type Language = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  speechProvider: string | null;
  speechLocale: string | null;
  speechVoiceName: string | null;
};

type AddWordAction = (formData: FormData) => Promise<void>;
type AddLanguageAction = (formData: FormData) => Promise<void>;
type RemoveLanguageAction = (formData: FormData) => Promise<void>;
type UpdateWordAction = (formData: FormData) => Promise<void>;
type DeleteWordAction = (formData: FormData) => Promise<void>;
type UpdateMemberRoleAction = (formData: FormData) => Promise<void>;
type RemoveMemberAction = (formData: FormData) => Promise<void>;
type AttemptAction = (formData: FormData) => unknown | Promise<unknown>;
type ReviewAttempt = {
  id: string;
  vocabularyEntryId: string;
  displayForm: string;
  correct: boolean;
  usedHint: boolean;
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
  rateReviewAction,
  dueWordIds,
  savePracticePreferenceAction,
  initialSelectedIds,
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
  rateReviewAction: AttemptAction;
  dueWordIds: string[];
  savePracticePreferenceAction: AttemptAction;
  initialSelectedIds: string[];
}) {
  const searchParams=useSearchParams();
  const requestedMode=searchParams.get("mode");
  const requestedLanguageId=searchParams.get("languageId");
  const [tab, setTab] = useState("vocabulary");
  const [tabReady, setTabReady] = useState(false);
  const [activeLanguageId, setActiveLanguageId] = useState(groupLanguages[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeTabStorageKey = `talkie-group-${groupId}-active-tab`;

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
    if(requestedMode==="due"||requestedMode==="weak"){setTab("flashcards");if(requestedLanguageId&&groupLanguages.some(item=>item.id===requestedLanguageId))setActiveLanguageId(requestedLanguageId);setTabReady(true);return;}
    const stored = localStorage.getItem(activeTabStorageKey);
    if (stored && ["vocabulary", "flashcards", "members"].includes(stored)) {
      setTab(stored);
    } else {
      setTab("vocabulary");
    }
    setTabReady(true);
  }, [activeTabStorageKey,requestedMode,requestedLanguageId,groupLanguages]);

  useEffect(() => {
    if (!tabReady) return;
    if (tab === "flashcards" && !activeLanguageId) return;
    if (!activeLanguageId || !groupLanguages.some((language) => language.id === activeLanguageId)) {
      setActiveLanguageId(groupLanguages[0]?.id ?? "");
    }
  }, [activeLanguageId, groupLanguages, tab, tabReady]);

  const selectTab = (slug: string) => {
    setTab(slug);
    localStorage.setItem(activeTabStorageKey, slug);
  };

  useEffect(() => {
    const allWordIds = new Set(words.map((word) => word.id));
    const next = new Set(initialSelectedIds.filter((id) => allWordIds.has(id)));
    localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify([...next]));
    setSelected(next);
  }, [words, groupId, initialSelectedIds]);

  const savePracticePreference = (id: string, enabled: boolean) => {
    const formData = new FormData();
    formData.append("wordId", id);
    formData.append("enabled", String(enabled));
    savePracticePreferenceAction(formData);
  };

  const toggleFlashcard = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      const enabled = !next.has(id);
      enabled ? next.add(id) : next.delete(id);
      localStorage.setItem(`talkie-group-${groupId}-flashcards`, JSON.stringify([...next]));
      savePracticePreference(id, enabled);
      return next;
    });
  };

  const setFlashcards = (ids: string[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
        savePracticePreference(id, checked);
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
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Group sections">
          {[
            { id: "vocabulary", label: "Vocabulary" },
            { id: "flashcards", label: "Flashcards" },
            { id: "members", label: "Members" },
          ].map((item) => (
            <Button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tabReady && tab === item.id}
              variant="ghost"
              size="sm"
              onClick={() => selectTab(item.id)}
              className={`h-10 rounded-none border-b-2 bg-transparent! px-3 font-medium shadow-none hover:bg-transparent! ${
                tabReady && tab === item.id
                  ? "border-ring text-foreground hover:text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {tabReady && isOwnerOrAdmin && tab !== "flashcards" && (
          <form className="pb-3 flex items-center gap-2 text-xs">
            <input type="hidden" name="groupId" value={groupId} />
            <Checkbox
              id="allowMemberImports"
              name="allowMemberImports"
              defaultChecked={allowMemberImports}
              onCheckedChange={(checked) => {
                const formData = new FormData();
                formData.append("groupId", groupId);
                if (checked) formData.append("allowMemberImports", "on");
                toggleGroupMemberImportsAction(formData);
              }}
            />
            <label htmlFor="allowMemberImports" className="font-medium text-muted-foreground select-none cursor-pointer">
              Allow members to import flashcards
            </label>
          </form>
        )}
      </div>

      {tabReady && tab === "vocabulary" && (
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
                  <FormSelect name="languageId" defaultValue={addableLanguages[0]?.id} className="w-40" options={addableLanguages.map(language=>({value:language.id,label:language.name}))}/>
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
            <div className="rounded-lg border border-dashed p-8 text-center bg-muted/10">
              <p className="text-muted-foreground">No languages have been added to this group yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add a language from your Languages page to start a shared deck.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupLanguages.map((language) => {
                const count = wordsByLanguage.get(language.id)?.length ?? 0;
                const isActive = activeLanguage?.id === language.id;
                return (
                  <Button
                    key={language.id}
                    type="button"
                    onClick={() => setActiveLanguageId(language.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      isActive ? "border-ring/60 bg-accent/20 dark:bg-accent/10" : "hover:border-ring/40"
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
                  </Button>
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
                  buttonClassName="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/30"
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
                speechLocale={activeLanguage.speechLocale ?? activeLanguage.code}
                speechVoiceName={activeLanguage.speechVoiceName}
                speechProvider={activeLanguage.speechProvider}
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

      {tabReady && tab === "flashcards" && (
        <div className="space-y-4">
          {groupLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setActiveLanguageId("")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  !activeLanguage ? "border-ring bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                All Languages
              </Button>
              {groupLanguages.map((language) => (
                <Button
                  key={language.id}
                  type="button"
                  onClick={() => setActiveLanguageId(language.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    activeLanguage?.id === language.id ? "border-ring bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {language.name}
                </Button>
              ))}
            </div>
          )}
          <VocabularyFlashcards
            words={practiceWords}
            selectedIds={selected}
            languageId={activeLanguage?.id}
            groupId={groupId}
            speechLocale={activeLanguage?.speechLocale ?? activeLanguage?.code}
            speechVoiceName={activeLanguage?.speechVoiceName}
            speechProvider={activeLanguage?.speechProvider}
            reviewAttempts={activeAttempts}
            saveAttemptAction={saveAttemptAction}
            resetAttemptsAction={resetAttemptsAction}
            rateReviewAction={rateReviewAction}
            dueIds={new Set(dueWordIds)}
          />
          <div className="grid gap-4 sm:grid-cols-5">
            <Stat label="Days learned" value={new Set(activeAttempts.map((attempt) => new Date(attempt.createdAt).toDateString())).size} />
            <Stat label="New words" value={new Set(activeAttempts.map((attempt) => attempt.vocabularyEntryId)).size} />
            <Stat label="Correct" value={activeAttempts.filter((attempt) => attempt.correct).length} />
            <Stat label="Missed" value={activeAttempts.filter((attempt) => !attempt.correct).length} />
            <Stat label="Weak" value={new Set(activeAttempts.filter((attempt) => attempt.usedHint || !attempt.correct).map((attempt) => attempt.vocabularyEntryId)).size} />
          </div>
        </div>
      )}

      {tabReady && tab === "members" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Group Members ({members.length})</h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="w-full text-sm">
              <TableHeader className="bg-muted text-left">
                <TableRow>
                  <TableHead className="p-3">Name</TableHead>
                  <TableHead className="p-3">Role</TableHead>
                  <TableHead className="p-3 text-right">Joined</TableHead>
                  <TableHead className="p-3 text-right">Friend</TableHead>
                  {isOwner && <TableHead className="p-3 text-right">Manage</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const canManageMember = isOwner && member.role !== "OWNER" && member.userId !== currentUserId;
                  return (
                    <TableRow key={member.id} className="border-t">
                      <TableCell className="p-3 font-medium">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={member.user.name} email={member.user.email} image={member.user.image} size="sm" />
                          <div>
                            <p>{member.user.name || member.user.email}</p>
                            {member.user.name && <p className="text-xs font-normal text-muted-foreground">{member.user.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          member.role === "OWNER"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : member.role === "ADMIN"
                              ? "bg-muted text-foreground border border-border"
                              : "bg-muted text-foreground border border-border"
                        }`}>
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell className="p-3 text-right text-xs text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        {member.userId === currentUserId ? <span className="text-xs text-muted-foreground">You</span> : member.user.friendGroupDiscoverable || member.friendStatus !== "NONE" ? (
                          <AddFriendButton recipientId={member.userId} groupId={groupId} initialStatus={member.friendStatus} iconOnly />
                        ) : <span className="text-xs text-muted-foreground">Private</span>}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="p-3">
                          {canManageMember ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <form action={updateMemberRoleAction} className="flex items-center gap-2">
                                <input type="hidden" name="groupId" value={groupId} />
                                <input type="hidden" name="memberId" value={member.id} />
                                <FormSelect name="role" defaultValue={member.role} className="h-8 w-28 text-xs" options={[{value:"MEMBER",label:"Member"},{value:"ADMIN",label:"Admin"}]}/>
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
                                buttonClassName="h-8 rounded-md border px-3 text-sm font-medium text-foreground hover:bg-accent/30"
                              >
                                Remove
                              </ConfirmActionForm>
                            </div>
                          ) : (
                            <p className="text-right text-xs text-muted-foreground">Owner</p>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
