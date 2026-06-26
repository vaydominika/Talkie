"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Word = {
  id: string;
  displayForm: string;
  definition: string;
  translations: { text: string }[];
  japanese: { kana: string } | null;
};

type Direction = "target-native" | "native-target" | "random";
type Card = { word: Word; direction: Exclude<Direction, "random"> };
type AttemptAction = (formData: FormData) => void | Promise<void>;

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
  saveAttemptAction,
  resetAttemptsAction,
}: {
  words: Word[];
  selectedIds: Set<string>;
  languageId?: string;
  groupId?: string;
  saveAttemptAction?: AttemptAction;
  resetAttemptsAction?: AttemptAction;
}) {
  const selectedWords = useMemo(() => words.filter((word) => selectedIds.has(word.id)), [words, selectedIds]);
  const [direction, setDirection] = useState<Direction>("target-native");
  const [randomOrder, setRandomOrder] = useState(true);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [revealed, setRevealed] = useState(false);

  const rebuild = (nextDirection = direction, nextRandomOrder = randomOrder) => {
    setDirection(nextDirection);
    setRandomOrder(nextRandomOrder);
    setDeck(buildDeck(selectedWords, nextDirection, nextRandomOrder));
    setIndex(0);
    setAnswer("");
    setStatus("idle");
    setRevealed(false);
  };

  useEffect(() => {
    rebuild(direction, randomOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWords]);

  const card = deck[index % Math.max(deck.length, 1)];
  const prompt = card?.direction === "native-target" ? nativeAnswer(card.word) : card?.word.displayForm;
  const expected = card?.direction === "native-target" ? card.word.displayForm : card ? nativeAnswer(card.word) : "";
  const helper = card?.direction === "native-target" ? "Write the language word." : "Write the English meaning.";

  const next = () => {
    setAnswer("");
    setStatus("idle");
    setRevealed(false);
    setIndex((current) => (deck.length ? (current + 1) % deck.length : 0));
  };

  const resetAll = () => {
    if (resetAttemptsAction && languageId) {
      const formData = new FormData();
      formData.append("languageId", languageId);
      if (groupId) formData.append("groupId", groupId);
      resetAttemptsAction(formData);
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

    if (saveAttemptAction && languageId) {
      const formData = new FormData();
      formData.append("wordId", card.word.id);
      formData.append("languageId", languageId);
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
  };

  if (!selectedWords.length) {
    return (
      <section className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-xl font-semibold">No vocabulary flashcards yet.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Select words from the Vocabulary tab to practice them here.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
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
        <button type="button" onClick={resetAll} className="rounded-full border border-stone-500 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800">
          Reset
        </button>
      </div>

      <section className="animate-panel-in mx-auto max-w-xl rounded-lg border bg-[#fbfaf4] p-6 text-center shadow-sm dark:bg-stone-950">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-700">Vocabulary sprint</p>
        <p className="mt-8 text-5xl font-semibold text-stone-900 dark:text-stone-100">{prompt}</p>
        {card?.direction === "target-native" && card.word.japanese?.kana && <p className="mt-2 text-lg text-muted-foreground">{card.word.japanese.kana}</p>}
        <p className="mt-3 text-xs text-muted-foreground">{helper}</p>

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
          {index + 1} / {deck.length} selected words
        </p>
      </section>
    </div>
  );
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
