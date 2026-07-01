"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SpeakButton } from "@/components/speak-button";
import { summarizeWeakWords, type ReviewAttemptLike } from "@/lib/vocabulary-review";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  pronunciation: string | null;
  translations: { text: string }[];
  japanese: { kana: string } | null;
  language?: { id?: string; code: string; speechProvider: string | null; speechLocale: string | null; speechVoiceName: string | null };
};

type Direction = "target-native" | "native-target" | "random";
type StudyMode = "all" | "weak";
type Card = { word: Word; direction: Exclude<Direction, "random"> };
type AttemptAction = (formData: FormData) => void | Promise<void>;
type ReviewAttempt = ReviewAttemptLike & {
  id: string;
};

const normalize = (value: string) => value.toLowerCase().trim();

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

function nativeAnswer(word: Word) {
  return word.translations.map((translation) => translation.text).join(", ") || word.definition;
}

function buildDeck(words: Word[], direction: Direction, randomOrder: boolean): Card[] {
  const cards = words.map((word) => ({
    word,
    direction:
      direction === "random"
        ? Math.random() > 0.5
          ? "target-native"
          : "native-target"
        : direction,
  })) satisfies Card[];
  return randomOrder ? shuffle(cards) : cards;
}

export function VocabularyFlashcards({
  words,
  selectedIds,
  languageId,
  groupId,
  speechLocale,
  speechVoiceName,
  speechProvider,
  reviewAttempts = [],
  saveAttemptAction,
  resetAttemptsAction,
}: {
  words: Word[];
  selectedIds: Set<string>;
  languageId?: string;
  groupId?: string;
  speechLocale?: string | null;
  speechVoiceName?: string | null;
  speechProvider?: string | null;
  reviewAttempts?: ReviewAttempt[];
  saveAttemptAction?: AttemptAction;
  resetAttemptsAction?: AttemptAction;
}) {
  const selectedWords = useMemo(() => words.filter((word) => selectedIds.has(word.id)), [words, selectedIds]);
  const [localReviewAttempts, setLocalReviewAttempts] = useState<ReviewAttempt[]>(reviewAttempts);
  useEffect(() => setLocalReviewAttempts(reviewAttempts), [reviewAttempts]);
  const weakSummaries = useMemo(() => summarizeWeakWords(localReviewAttempts), [localReviewAttempts]);
  const activeWeakSummaries = useMemo(() => weakSummaries.filter((summary) => !summary.cleared), [weakSummaries]);
  const weakSummaryByWordId = useMemo(
    () => new Map(activeWeakSummaries.map((summary) => [summary.vocabularyEntryId, summary])),
    [activeWeakSummaries],
  );
  const weakWordIds = useMemo(() => new Set(activeWeakSummaries.map((summary) => summary.vocabularyEntryId)), [activeWeakSummaries]);
  const [direction, setDirection] = useState<Direction>("target-native");
  const [studyMode, setStudyMode] = useState<StudyMode>("all");
  const [randomOrder, setRandomOrder] = useState(true);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [revealed, setRevealed] = useState(false);
  const practiceWords = useMemo(
    () => (studyMode === "weak" ? selectedWords.filter((word) => weakWordIds.has(word.id)) : selectedWords),
    [selectedWords, studyMode, weakWordIds],
  );

  const rebuild = (nextDirection = direction, nextRandomOrder = randomOrder, nextStudyMode = studyMode) => {
    setDirection(nextDirection);
    setRandomOrder(nextRandomOrder);
    setStudyMode(nextStudyMode);
    const nextWords = nextStudyMode === "weak" ? selectedWords.filter((word) => weakWordIds.has(word.id)) : selectedWords;
    setDeck(buildDeck(nextWords, nextDirection, nextRandomOrder));
    setIndex(0);
    setAnswer("");
    setStatus("idle");
    setRevealed(false);
  };

  useEffect(() => {
    rebuild(direction, randomOrder, studyMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWords, studyMode, weakWordIds]);

  const card = deck[index % Math.max(deck.length, 1)];
  const weakSummary = card ? weakSummaryByWordId.get(card.word.id) : undefined;
  const prompt = card?.direction === "native-target" ? nativeAnswer(card.word) : card?.word.displayForm;
  const expected = card?.direction === "native-target" ? card.word.displayForm : card ? nativeAnswer(card.word) : "";
  const helper = card?.direction === "native-target" ? card.word.pronunciation : card?.word.pronunciation;
  const activeSpeechLocale = card?.word.language?.speechLocale ?? card?.word.language?.code ?? speechLocale;
  const activeSpeechVoiceName = card?.word.language?.speechVoiceName ?? speechVoiceName;
  const activeSpeechProvider = card?.word.language?.speechProvider ?? speechProvider;

  const next = () => {
    setAnswer("");
    setStatus("idle");
    setRevealed(false);
    setIndex((current) => (deck.length ? (current + 1) % deck.length : 0));
  };

  const restartDeck = () => {
    rebuild();
  };

  const clearReviewHistory = () => {
    if (resetAttemptsAction && languageId) {
      if (!window.confirm("Clear review history for this deck? This removes missed and hint-used attempt history.")) return;
      const formData = new FormData();
      formData.append("languageId", languageId);
      if (groupId) formData.append("groupId", groupId);
      resetAttemptsAction(formData);
      setLocalReviewAttempts([]);
    }
    rebuild();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!card) return;
    if (status !== "idle") {
      next();
      return;
    }

    const correct = normalize(answer) === normalize(expected);
    setStatus(correct ? "correct" : "wrong");

    const attemptLanguageId = languageId ?? card.word.language?.id;
    if (saveAttemptAction && attemptLanguageId) {
      const formData = new FormData();
      formData.append("wordId", card.word.id);
      formData.append("languageId", attemptLanguageId);
      if (groupId) formData.append("groupId", groupId);
      formData.append("displayForm", card.word.displayForm);
      formData.append("prompt", prompt ?? "");
      formData.append("expected", expected);
      formData.append("answer", answer);
      formData.append("direction", card.direction);
      formData.append("correct", String(correct));
      formData.append("usedHint", String(revealed));
      saveAttemptAction(formData);
    }
    setLocalReviewAttempts((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        vocabularyEntryId: card.word.id,
        displayForm: card.word.displayForm,
        correct,
        usedHint: revealed,
        createdAt: new Date(),
      },
    ]);
  };

  if (!selectedWords.length) {
    return (
      <section className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-xl font-semibold">No vocabulary flashcards yet.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Select words from the Vocabulary tab to practice them here.</p>
      </section>
    );
  }

  if (!practiceWords.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          <Toggle active={studyMode === "all"} onClick={() => rebuild(direction, randomOrder, "all")}>
            All
          </Toggle>
          <Toggle active={studyMode === "weak"} onClick={() => rebuild(direction, randomOrder, "weak")}>
            Weak
          </Toggle>
          <Toggle active={randomOrder} onClick={() => rebuild(direction, !randomOrder, studyMode)}>
            {randomOrder ? "Random order" : "Ordered"}
          </Toggle>
        </div>
        <section className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-xl font-semibold">No weak words right now.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Weak words appear here after a hint is used or an answer is missed, and stay until answered correctly without a hint.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        <Toggle active={studyMode === "all"} onClick={() => rebuild(direction, randomOrder, "all")}>
          All
        </Toggle>
        <Toggle active={studyMode === "weak"} onClick={() => rebuild(direction, randomOrder, "weak")}>
          Weak
        </Toggle>
        <Toggle active={direction === "target-native"} onClick={() => rebuild("target-native")}>
          Word to English
        </Toggle>
        <Toggle active={direction === "native-target"} onClick={() => rebuild("native-target")}>
          English to Word
        </Toggle>
        <Toggle active={direction === "random"} onClick={() => rebuild("random")}>
          Random side
        </Toggle>
        <Toggle active={randomOrder} onClick={() => rebuild(direction, !randomOrder)}>
          {randomOrder ? "Random order" : "Ordered"}
        </Toggle>
        <button type="button" onClick={restartDeck} className="rounded-full border border-stone-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800">
          Restart deck
        </button>
        {resetAttemptsAction && languageId ? (
          <button type="button" onClick={clearReviewHistory} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:bg-stone-900 dark:hover:bg-rose-950/30">
            Clear review history
          </button>
        ) : null}
      </div>

      <section className="animate-panel-in mx-auto max-w-xl rounded-lg border bg-[#fbfaf4] p-6 text-center shadow-sm dark:bg-stone-950">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-700">Vocabulary sprint</p>
          {studyMode === "weak" ? <Badge tone="rose">Weak</Badge> : null}
          {weakSummary?.carriedOver ? <Badge tone="stone">Carried over</Badge> : null}
        </div>
        {weakSummary ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            {weakSummary.missedCount > 0 ? <Badge tone={weakSummary.missedCount > 1 ? "red" : "rose"}>{weakSummary.missedCount} missed</Badge> : null}
            {weakSummary.hintUsedCount > 0 ? <Badge tone="amber">{weakSummary.hintUsedCount} hint used</Badge> : null}
            <Badge tone={weakSummary.severity > 3 ? "red" : "rose"}>Severity {weakSummary.severity}</Badge>
          </div>
        ) : null}
        <div className="mt-8 flex items-center justify-center gap-3">
          <p className="text-5xl font-semibold text-stone-900 dark:text-stone-100">{prompt}</p>
          {card?.direction === "target-native" && card.word.displayForm && (
            <SpeakButton text={card.word.displayForm} locale={activeSpeechLocale} voiceName={activeSpeechVoiceName} provider={activeSpeechProvider} className="h-9 w-9 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-800" />
          )}
        </div>
        {card?.direction === "target-native" && card.word.japanese?.kana && <p className="mt-2 text-lg text-muted-foreground">{card.word.japanese.kana}</p>}
        {helper && <p className="mt-3 text-sm font-medium text-muted-foreground">[{helper}]</p>}

        <form onSubmit={submit} className="mt-7">
          <input
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setStatus("idle");
            }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className={`h-14 w-full rounded-lg border bg-white px-4 text-center font-mono text-xl text-stone-900 outline-none transition focus:ring-2 ${
              status === "correct"
                ? "border-[#82946d] bg-[#e5ebdf] focus:ring-[#a8b99a]"
                : status === "wrong"
                  ? "border-rose-500 bg-rose-50 focus:ring-rose-300"
                  : "focus:ring-rose-300"
            }`}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setRevealed((value) => !value)} className="rounded-md border border-stone-500 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800">
              {revealed ? "Hide answer" : "Reveal answer"}
            </button>
            {status !== "idle" && (
              <button type="submit" className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">
                Next card
              </button>
            )}
            <button type="button" onClick={next} className="rounded-md border border-stone-500 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800">
              Skip
            </button>
          </div>
          {revealed && <p className="mt-3 animate-answer-reveal font-mono text-sm font-semibold text-rose-700">{expected}</p>}
          <p className={`mt-3 min-h-5 text-sm font-medium ${status === "correct" ? "text-[#4a5b3b]" : status === "wrong" ? "text-rose-600" : "text-transparent"}`}>
            {status === "correct" ? "Correct. Press Enter again for the next card." : "Try again, or press Enter again for the next card."}
          </p>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">
          {index + 1} / {deck.length} {studyMode === "weak" ? "weak" : "selected"} words
        </p>
      </section>
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber" | "rose" | "red" | "stone"; children: React.ReactNode }) {
  const className =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-800"
        : tone === "stone"
          ? "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          : "border-rose-200 bg-rose-50 text-rose-700";

  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

function Toggle({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
        active
          ? "border-rose-600 bg-rose-600 text-white"
          : "border-stone-500 bg-white text-stone-900 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </button>
  );
}
