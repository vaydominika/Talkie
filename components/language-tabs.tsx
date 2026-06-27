"use client";

import { useEffect, useMemo, useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";
import { JapaneseReview } from "@/components/japanese-review";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { VocabularyTable } from "@/components/vocabulary-table";
import { VocabularyFlashcards } from "@/components/vocabulary-flashcards";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  pronunciation: string | null;
  translations: { text: string }[];
  japanese: { kana: string } | null;
};
type ReviewAttempt = {
  id: string;
  vocabularyEntryId: string;
  displayForm: string;
  prompt: string;
  expected: string;
  answer: string;
  correct: boolean;
  createdAt: Date;
};
type Grammar = {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  richContent?: unknown;
  level: { code: string } | null;
};
type LanguageTab = {
  id: string;
  title: string;
  slug: string;
  type: "LEARNING" | "FLASHCARDS" | "VOCABULARY" | "GRAMMAR" | "CUSTOM";
  content?: unknown;
};
type Action = (formData: FormData) => void | Promise<void>;
type SyncAction = (formData: FormData) => void | Promise<void>;
type GroupSyncTarget = {
  id: string;
  name: string;
  wordCount: number;
  mineToGroupCount: number;
  groupToMineCount: number;
  canImportToGroup: boolean;
};

const defaultTabs: LanguageTab[] = [
  { id: "learning", title: "Learning", slug: "learning", type: "LEARNING" },
  { id: "flashcards", title: "Flashcards", slug: "flashcards", type: "FLASHCARDS" },
  { id: "vocabulary", title: "Vocabulary", slug: "vocabulary", type: "VOCABULARY" },
  { id: "review", title: "Review", slug: "review", type: "CUSTOM" },
  { id: "grammar", title: "Grammar", slug: "grammar", type: "GRAMMAR" },
];

function noteFromContent(content: unknown) {
  return typeof content === "object" && content && "note" in content ? String(content.note ?? "") : "";
}

function htmlFromRichContent(content: unknown) {
  return typeof content === "object" && content && "html" in content ? String(content.html ?? "") : "";
}

export function LanguageTabs({
  language,
  languageCode,
  speechLocale,
  speechVoiceName,
  speechProvider,
  tabs,
  words,
  grammar,
  addWord,
  addWordsBulk,
  updateWord,
  deleteWord,
  languageId,
  groupSyncTargets = [],
  reviewAttempts,
  saveAttemptAction,
  resetAttemptsAction,
  importGroupVocabularyToProfileAction,
  importProfileVocabularyToGroupAction,
  strokeOrderImages = {},
}: {
  language: string;
  languageCode: string;
  speechLocale?: string | null;
  speechVoiceName?: string | null;
  speechProvider?: string | null;
  tabs: LanguageTab[];
  words: Word[];
  grammar: Grammar[];
  addWord: Action;
  addWordsBulk: Action;
  updateWord: Action;
  deleteWord: Action;
  languageId: string;
  groupSyncTargets?: GroupSyncTarget[];
  reviewAttempts: ReviewAttempt[];
  saveAttemptAction: Action;
  resetAttemptsAction: Action;
  importGroupVocabularyToProfileAction: SyncAction;
  importProfileVocabularyToGroupAction: SyncAction;
  strokeOrderImages?: Record<string, string>;
}) {
  const visibleTabs = useMemo(() => {
    const base = tabs.length ? tabs : defaultTabs.filter((tab) => tab.slug !== "review");
    return base.some((tab) => tab.slug === "review")
      ? base
      : [...base.slice(0, 3), { id: "review", title: "Review", slug: "review", type: "CUSTOM" as const }, ...base.slice(3)];
  }, [tabs]);
  const [tab, setTab] = useState(visibleTabs[0]?.slug ?? "learning");
  const [tabReady, setTabReady] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(groupSyncTargets[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeTabStorageKey = `talkie-language-${languageCode}-active-tab`;
  const activeTab = tabReady ? visibleTabs.find((item) => item.slug === tab) ?? visibleTabs[0] : undefined;
  const isJapanese = languageCode.toLowerCase() === "ja";
  const selectedGroup = groupSyncTargets.find((group) => group.id === selectedGroupId) ?? groupSyncTargets[0];
  const correctCount = reviewAttempts.filter((attempt) => attempt.correct).length;
  const uniqueReviewed = new Set(reviewAttempts.map((attempt) => attempt.vocabularyEntryId)).size;
  const learnedDays = new Set(reviewAttempts.map((attempt) => new Date(attempt.createdAt).toDateString())).size;
  const missedAttempts = reviewAttempts.filter((attempt) => !attempt.correct);

  useEffect(() => {
    const stored = localStorage.getItem("talkie-vocabulary-flashcards");
    const allWordIds = words.map((word) => word.id);
    if (stored === null) {
      localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify(allWordIds));
      setSelected(new Set(allWordIds));
      return;
    }
    const storedIds = JSON.parse(stored) as string[];
    const next = new Set([...storedIds, ...allWordIds.filter((id) => !storedIds.includes(id))]);
    localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify([...next]));
    setSelected(next);
  }, [words]);

  useEffect(() => {
    const stored = localStorage.getItem(activeTabStorageKey);
    if (stored && visibleTabs.some((item) => item.slug === stored)) {
      setTab(stored);
    } else {
      setTab(visibleTabs[0]?.slug ?? "learning");
    }
    setTabReady(true);
  }, [activeTabStorageKey, visibleTabs]);

  useEffect(() => {
    if (!tabReady) return;
    if (!visibleTabs.some((item) => item.slug === tab)) {
      const fallbackTab = visibleTabs[0]?.slug ?? "learning";
      setTab(fallbackTab);
      localStorage.setItem(activeTabStorageKey, fallbackTab);
    }
  }, [activeTabStorageKey, tab, tabReady, visibleTabs]);

  const selectTab = (slug: string) => {
    setTab(slug);
    localStorage.setItem(activeTabStorageKey, slug);
  };

  const toggleFlashcard = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify([...next]));
      return next;
    });

  const setFlashcards = (ids: string[], checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify([...next]));
      return next;
    });

  return (
    <div>
      <div className="mb-6 border-b">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => selectTab(item.slug)}
            className={`mr-5 border-b-2 px-1 pb-3 text-sm font-medium ${
              tabReady && tab === item.slug ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      {!tabReady ? null : activeTab?.type === "LEARNING" ? (
        isJapanese ? (
          <KanaChecker strokeOrderImages={strokeOrderImages} />
        ) : (
          <section className="rounded-2xl border border-dashed p-8 text-center">
            <h2 className="font-serif text-2xl">{language} learning</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add lessons, grammar, vocab, and tests from Content Studio.</p>
          </section>
        )
      ) : activeTab?.type === "FLASHCARDS" || activeTab?.slug === "flashcards" ? (
        <div className="space-y-6">
          {isJapanese && <KanaFlashcards />}
          <VocabularyFlashcards
            words={words}
            selectedIds={selected}
            languageId={languageId}
            speechLocale={speechLocale ?? languageCode}
            speechVoiceName={speechVoiceName}
            speechProvider={speechProvider}
            saveAttemptAction={saveAttemptAction}
            resetAttemptsAction={resetAttemptsAction}
          />
        </div>
      ) : activeTab?.type === "VOCABULARY" ? (
        <VocabularyTable
          title={`My ${language} Vocabulary (${words.length})`}
          subtitle="Personal words stay separate from group words until you copy them."
          words={words}
          languageId={languageId}
          speechLocale={speechLocale ?? languageCode}
          speechVoiceName={speechVoiceName}
          speechProvider={speechProvider}
          selectedIds={selected}
          onToggleFlashcard={toggleFlashcard}
          onSetFlashcards={setFlashcards}
          addAction={addWord}
          bulkAddAction={addWordsBulk}
          updateAction={updateWord}
          deleteAction={deleteWord}
          syncControls={
            groupSyncTargets.length > 0 && selectedGroup ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedGroup.id}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {groupSyncTargets.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <form action={importGroupVocabularyToProfileAction}>
                  <input type="hidden" name="groupId" value={selectedGroup.id} />
                  <input type="hidden" name="languageId" value={languageId} />
                  <PendingSubmitButton
                    disabled={selectedGroup.groupToMineCount === 0}
                    pendingLabel="Copying..."
                    className="h-10 rounded-md border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy group to mine
                  </PendingSubmitButton>
                </form>
                {selectedGroup.canImportToGroup && (
                  <form action={importProfileVocabularyToGroupAction}>
                    <input type="hidden" name="groupId" value={selectedGroup.id} />
                    <input type="hidden" name="languageId" value={languageId} />
                    <PendingSubmitButton
                      disabled={selectedGroup.mineToGroupCount === 0}
                      pendingLabel="Copying..."
                      className="h-10 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy mine to group
                    </PendingSubmitButton>
                  </form>
                )}
              </div>
            ) : null
          }
        />
      ) : activeTab?.slug === "review" ? (
        isJapanese ? (
          <JapaneseReview reviewAttempts={reviewAttempts} />
        ) : (
          <div className="space-y-6">
          <div className="animate-panel-in grid gap-4 sm:grid-cols-4">
            <Stat label="Days learned" value={learnedDays} />
            <Stat label="New words" value={uniqueReviewed} />
            <Stat label="Correct" value={correctCount} />
            <Stat label="Missed" value={reviewAttempts.length - correctCount} />
          </div>
          {missedAttempts.length === 0 ? (
            <section className="animate-panel-in rounded-lg border border-dashed p-8 text-center">
              <h2 className="text-xl font-semibold">No missed answers yet.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Wrong answers from flashcards will appear here.</p>
            </section>
          ) : (
            <div className="animate-panel-in overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3">Word</th>
                    <th className="p-3">Prompt</th>
                    <th className="p-3">Expected</th>
                    <th className="p-3">Your answer</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {missedAttempts.map((attempt, index) => (
                    <tr key={attempt.id} className="animate-list-in border-t" style={{ animationDelay: `${index * 25}ms` }}>
                      <td className="p-3 font-medium">{attempt.displayForm}</td>
                      <td className="p-3">{attempt.prompt}</td>
                      <td className="p-3">{attempt.expected}</td>
                      <td className="p-3 text-rose-700">{attempt.answer || "-"}</td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{new Date(attempt.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        )
      ) : activeTab?.type === "GRAMMAR" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {grammar.map((point) => {
            const richHtml = htmlFromRichContent(point.richContent);
            return (
              <article key={point.id} className="rounded-xl border p-5">
                <h2 className="font-semibold">{point.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{point.level?.code}</p>
                <p className="mt-3 text-sm">{point.summary}</p>
                {richHtml ? (
                  <div className="prose prose-sm mt-3 max-w-none" dangerouslySetInnerHTML={{ __html: richHtml }} />
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">{point.explanation}</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed p-8">
          <h2 className="font-serif text-2xl">{activeTab?.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {noteFromContent(activeTab?.content) || "This custom tab is ready. Add its content in Content Studio."}
          </p>
        </section>
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
