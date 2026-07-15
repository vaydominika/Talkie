"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { kanaGroups, type KanaItem } from "@/lib/kana";
import { saveKanaAttempt } from "@/lib/kana-review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <section className="mx-auto max-w-md rounded-lg border border-ring bg-accent p-6 text-center text-accent-foreground">
      <OrderControls ordered={ordered} onChangeOrder={changeOrder} />

      <p className="mt-10 text-8xl text-accent-foreground">{item.kana}</p>

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

      <p className="mt-8 text-xs text-accent-foreground/70">Press Enter to check and move to the next prompt.</p>
    </section>
  );
}

function KanaCompleteCard({ onRestart }: { onRestart: () => void }) {
  return (
    <section className="mx-auto max-w-md rounded-lg border border-ring bg-accent p-8 text-center text-accent-foreground">
      <h2 className="font-serif text-3xl">Sprint complete.</h2>
      <p className="mt-2 text-sm text-accent-foreground/70">You cleared every selected kana.</p>
      <Button onClick={onRestart} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Start again
      </Button>
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
    <Button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}
    >
      {children}
    </Button>
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
        <Input
          value={answer}
          onChange={(event) => onChangeAnswer(event.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className={`h-14 border-ring! bg-background/90 text-center font-mono text-xl ${inputStatusClassName(status)}`}
        />
        <Button
          type="button"
          onClick={onToggleHint}
          aria-label="Toggle answer"
          className="absolute right-2 top-2 rounded p-2 text-muted-foreground hover:bg-muted"
        >
          {hint ? <EyeOff size={19} /> : <Eye size={19} />}
        </Button>
      </div>

      {hint ? <p className="mt-2 animate-answer-reveal font-mono text-sm text-accent-foreground">{item.romaji}</p> : null}

      <p className={`mt-3 min-h-5 text-sm font-medium ${statusTextClassName(status)}`}>
        {status === "correct" ? "Correct" : "Try again"}
      </p>
    </form>
  );
}

function inputStatusClassName(status: Status) {
  if (status === "correct") return "bg-success/15 focus:ring-success/30";
  if (status === "wrong") return "bg-destructive/10 focus:ring-destructive/30";
  return "focus:ring-ring/40";
}

function statusTextClassName(status: Status) {
  if (status === "correct") return "text-success";
  if (status === "wrong") return "text-destructive";
  return "text-transparent";
}
