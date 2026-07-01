"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { kanaGroups, type KanaItem } from "@/lib/kana";
import { saveKanaAttempt } from "@/lib/kana-review";

type Status = "idle" | "correct" | "wrong";

const normalize = (value: string) => value.toLowerCase().trim().replace(/[^a-z]/g, "");
const expected = (romaji: string) => romaji.split(" (")[0];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export function KanaFlashcards() {
  const allKana = useMemo(() => kanaGroups.hiragana.flatMap((group) => group.items), []);
  const [ordered, setOrdered] = useState(false);
  const [deck, setDeck] = useState(allKana);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const item = deck[index];

  const resetPrompt = () => {
    setAnswer("");
    setHint(false);
    setStatus("idle");
  };

  const changeOrder = (nextOrdered: boolean) => {
    setOrdered(nextOrdered);
    setDeck(nextOrdered ? allKana : shuffle(allKana));
    setIndex(0);
    resetPrompt();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;

    const correct = normalize(answer) === normalize(expected(item.romaji));
    setStatus(correct ? "correct" : "wrong");
    saveKanaAttempt({
      id: crypto.randomUUID(),
      kana: item.kana,
      expected: item.romaji,
      answer,
      correct,
      usedHint: hint,
      at: Date.now(),
      source: "flashcards",
    });

    window.setTimeout(() => {
      if (correct) {
        setDeck((current) => current.filter((_, cardIndex) => cardIndex !== index));
        setIndex((current) => (current >= deck.length - 1 ? 0 : current));
      } else {
        setDeck((current) => [...current, item]);
        setIndex((current) => (current + 1) % deck.length);
      }
      resetPrompt();
    }, 500);
  };

  if (!item) {
    return <KanaCompleteCard onRestart={() => changeOrder(ordered)} />;
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-[#fbfaf4] p-6 text-center shadow-sm dark:bg-stone-950">
      <OrderControls ordered={ordered} onChangeOrder={changeOrder} />

      <p className="mt-10 text-8xl text-stone-900 dark:text-stone-100">{item.kana}</p>

      <KanaAnswerForm
        answer={answer}
        hint={hint}
        item={item}
        status={status}
        onChangeAnswer={(value) => {
          setAnswer(value);
          setStatus("idle");
        }}
        onSubmit={submit}
        onToggleHint={() => setHint((value) => !value)}
      />

      <p className="mt-8 text-xs text-muted-foreground">Press Enter to check and move to the next prompt.</p>
    </section>
  );
}

function KanaCompleteCard({ onRestart }: { onRestart: () => void }) {
  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-[#fbfaf4] p-8 text-center shadow-sm dark:bg-stone-950">
      <h2 className="font-serif text-3xl">Sprint complete.</h2>
      <p className="mt-2 text-sm text-muted-foreground">You cleared every selected kana.</p>
      <button onClick={onRestart} className="mt-6 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white">
        Start again
      </button>
    </section>
  );
}

function OrderControls({
  ordered,
  onChangeOrder,
}: {
  ordered: boolean;
  onChangeOrder: (ordered: boolean) => void;
}) {
  return (
    <div className="flex justify-center gap-2">
      <OrderButton active={!ordered} onClick={() => onChangeOrder(false)}>
        Random
      </OrderButton>
      <OrderButton active={ordered} onClick={() => onChangeOrder(true)}>
        Ordered
      </OrderButton>
    </div>
  );
}

function OrderButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-rose-600 text-white" : "border border-stone-500 text-stone-200"}`}
    >
      {children}
    </button>
  );
}

function KanaAnswerForm({
  answer,
  hint,
  item,
  status,
  onChangeAnswer,
  onSubmit,
  onToggleHint,
}: {
  answer: string;
  hint: boolean;
  item: KanaItem;
  status: Status;
  onChangeAnswer: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleHint: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8">
      <div className="relative">
        <input
          value={answer}
          onChange={(event) => onChangeAnswer(event.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className={`h-14 w-full rounded-lg border bg-white px-4 text-center font-mono text-xl text-stone-900 outline-none transition focus:ring-2 ${inputStatusClassName(status)}`}
        />
        <button
          type="button"
          onClick={onToggleHint}
          aria-label="Toggle answer"
          className="absolute right-2 top-2 rounded p-2 text-stone-500 hover:bg-stone-100"
        >
          {hint ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>

      {hint ? <p className="mt-2 animate-answer-reveal font-mono text-sm text-rose-700">{item.romaji}</p> : null}

      <p className={`mt-3 min-h-5 text-sm font-medium ${statusTextClassName(status)}`}>
        {status === "correct" ? "Correct" : "Try again"}
      </p>
    </form>
  );
}

function inputStatusClassName(status: Status) {
  if (status === "correct") return "border-[#82946d] bg-[#e5ebdf] focus:ring-[#a8b99a]";
  if (status === "wrong") return "border-rose-500 bg-rose-50 focus:ring-rose-300";
  return "focus:ring-rose-300";
}

function statusTextClassName(status: Status) {
  if (status === "correct") return "text-[#4a5b3b]";
  if (status === "wrong") return "text-rose-600";
  return "text-transparent";
}
