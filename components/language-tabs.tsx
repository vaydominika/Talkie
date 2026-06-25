"use client";

import { useEffect, useMemo, useState } from "react";
import { KanaChecker } from "@/components/kana-checker";
import { KanaFlashcards } from "@/components/kana-flashcards";
import { VocabularyFlashcards } from "@/components/vocabulary-flashcards";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  translations: { text: string }[];
  japanese: { kana: string } | null;
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
type AddWord = (formData: FormData) => void | Promise<void>;

const defaultTabs: LanguageTab[] = [
  { id: "learning", title: "Learning", slug: "learning", type: "LEARNING" },
  { id: "flashcards", title: "Flashcards", slug: "flashcards", type: "FLASHCARDS" },
  { id: "vocabulary", title: "Vocabulary", slug: "vocabulary", type: "VOCABULARY" },
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
  tabs,
  words,
  grammar,
  addWord,
  strokeOrderImages = {},
}: {
  language: string;
  languageCode: string;
  tabs: LanguageTab[];
  words: Word[];
  grammar: Grammar[];
  addWord: AddWord;
  strokeOrderImages?: Record<string, string>;
}) {
  const visibleTabs = useMemo(() => (tabs.length ? tabs : defaultTabs), [tabs]);
  const [tab, setTab] = useState(visibleTabs[0]?.slug ?? "learning");
  const [adding, setAdding] = useState(false);
  const [addToFlashcards, setAddToFlashcards] = useState(true);
  const [newWordId, setNewWordId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeTab = visibleTabs.find((item) => item.slug === tab) ?? visibleTabs[0];
  const isJapanese = languageCode.toLowerCase() === "ja";

  useEffect(() => {
    const stored = localStorage.getItem("talkie-vocabulary-flashcards");
    if (stored === null) {
      const allWordIds = words.map((word) => word.id);
      localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify(allWordIds));
      setSelected(new Set(allWordIds));
      return;
    }
    setSelected(new Set(JSON.parse(stored)));
  }, [words]);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.slug === tab)) setTab(visibleTabs[0]?.slug ?? "learning");
  }, [tab, visibleTabs]);

  const toggleFlashcard = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify([...next]));
      return next;
    });

  return (
    <div>
      <div className="mb-6 border-b">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.slug)}
            className={`mr-5 border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === item.slug ? "border-rose-600 text-rose-700" : "border-transparent text-muted-foreground"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      {activeTab?.type === "LEARNING" ? (
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
          <VocabularyFlashcards words={words} selectedIds={selected} />
        </div>
      ) : activeTab?.type === "VOCABULARY" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setNewWordId(crypto.randomUUID());
                setAddToFlashcards(true);
                setAdding(true);
              }}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white"
            >
              <span className="mr-1 text-lg leading-none">+</span>Add vocabulary
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="p-3">Word</th>
                  <th className="p-3">Meaning</th>
                  <th className="p-3">Flashcard</th>
                </tr>
              </thead>
              <tbody>
                {words.map((word) => (
                  <tr key={word.id} className="border-t">
                    <td className="p-3 font-medium">
                      {word.displayForm}
                      {word.japanese?.kana && <span className="ml-2 text-muted-foreground">{word.japanese.kana}</span>}
                    </td>
                    <td className="p-3">{word.translations.map((translation) => translation.text).join(", ") || word.definition}</td>
                    <td className="p-3">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={selected.has(word.id)} onChange={() => toggleFlashcard(word.id)} />
                        <span>Add to flashcards</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

      {adding && (
        <div role="dialog" aria-modal="true" aria-label="Add vocabulary" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            action={addWord}
            onSubmit={() => {
              if (addToFlashcards) {
                const next = new Set(selected);
                next.add(newWordId);
                localStorage.setItem("talkie-vocabulary-flashcards", JSON.stringify([...next]));
              }
            }}
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl"
          >
            <input type="hidden" name="id" value={newWordId} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Add vocabulary</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add a word to {language}.</p>
              </div>
              <button type="button" onClick={() => setAdding(false)} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
                Close
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium">
              Word
              <input name="word" required autoFocus className="mt-1 h-10 w-full rounded-md border bg-background px-3" />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Meaning
              <input name="meaning" required className="mt-1 h-10 w-full rounded-md border bg-background px-3" />
            </label>
            <label className="mt-4 inline-flex items-center gap-2 text-sm">
              <input name="addToFlashcards" type="checkbox" checked={addToFlashcards} onChange={(event) => setAddToFlashcards(event.target.checked)} />
              <span>Add to flashcards</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border px-3 py-2 text-sm font-medium">
                Cancel
              </button>
              <button className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white">Save vocabulary</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
