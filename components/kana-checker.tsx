"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { kanaGroups, type KanaCategory, type KanaItem } from "@/lib/kana";
import { saveKanaAttempt } from "@/lib/kana-review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Script = "hiragana" | "katakana";
type Status = "idle" | "correct" | "wrong";
type Order = "random" | "ordered";
type DrillCard = { id: string; item: KanaItem; value: string; status: Status; revealed: boolean };

const categoryOptions: { id: KanaCategory; label: string }[] = [
  { id: "core", label: "Core sounds" },
  { id: "dakuten", label: "Dakuten" },
  { id: "handakuten", label: "Handakuten" },
  { id: "combination", label: "Combinations" },
  { id: "small", label: "Small kana" },
];

const scripts: Script[] = ["hiragana", "katakana"];

const normalize = (value: string) => value.toLowerCase().trim().replace(/[^a-z]/g, "");
const expected = (romaji: string) => romaji.split(" (")[0];

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const newCard = (item: KanaItem): DrillCard => ({
  id: crypto.randomUUID(),
  item,
  value: "",
  status: "idle",
  revealed: false,
});

export function KanaChecker({ strokeOrderImages = {} }: { strokeOrderImages?: Record<string, string> }) {
  const [activeScripts, setActiveScripts] = useState<Set<Script>>(new Set(["hiragana"]));
  const [categories, setCategories] = useState<Set<KanaCategory>>(new Set(categoryOptions.map(({ id }) => id)));
  const [order, setOrder] = useState<Order>("random");
  const [strokeKana, setStrokeKana] = useState<string | null>(null);
  const [cards, setCards] = useState<DrillCard[]>([]);

  const pool = useMemo(
    () =>
      scripts.flatMap((script) =>
        activeScripts.has(script)
          ? kanaGroups[script].filter((group) => categories.has(group.category)).flatMap((group) => group.items)
          : [],
      ),
    [activeScripts, categories],
  );

  const buildBoard = (nextOrder: Order, preserve = false) => {
    const previousCards = new Map(cards.map((card) => [`${card.item.kana}:${card.item.romaji}`, card]));
    const items = nextOrder === "random" ? shuffle(pool) : pool;

    setCards(
      items.map((item) => {
        if (!preserve) return newCard(item);
        return previousCards.get(`${item.kana}:${item.romaji}`) ?? newCard(item);
      }),
    );
  };

  useEffect(() => {
    if (pool.length) buildBoard(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScripts, categories]);

  const toggleScript = (script: Script) => {
    setActiveScripts((current) => toggleSetValue(current, script));
  };

  const toggleCategory = (category: KanaCategory) => {
    setCategories((current) => toggleSetValue(current, category));
  };

  const setCard = (id: string, change: Partial<DrillCard>) => {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...change } : card)));
  };

  const check = (card: DrillCard) => {
    const correct = normalize(card.value) === normalize(expected(card.item.romaji));
    setCard(card.id, { status: correct ? "correct" : "wrong" });
    saveKanaAttempt({
      id: crypto.randomUUID(),
      kana: card.item.kana,
      expected: card.item.romaji,
      answer: card.value,
      correct,
      usedHint: card.revealed,
      at: Date.now(),
      source: "sprint",
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>, card: DrillCard) => {
    event.preventDefault();
    check(card);
  };

  const changeOrder = (nextOrder: Order) => {
    setOrder(nextOrder);
    buildBoard(nextOrder, true);
  };

  return (
    <div className="space-y-7">
      <KanaDeskHeader soundCount={pool.length} onRestart={() => buildBoard(order)}>
        <KanaFilters
          activeScripts={activeScripts}
          categories={categories}
          order={order}
          onChangeOrder={changeOrder}
          onToggleCategory={toggleCategory}
          onToggleScript={toggleScript}
        />
      </KanaDeskHeader>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((card) => (
          <KanaDrillCard
            key={card.id}
            card={card}
            hasStrokeOrder={Boolean(strokeOrderImages[card.item.kana])}
            onCheck={check}
            onShowStrokeOrder={setStrokeKana}
            onSubmit={submit}
            onUpdate={setCard}
          />
        ))}
      </section>

      {strokeKana ? (
        <StrokeOrderDialog imageUrl={strokeOrderImages[strokeKana]} kana={strokeKana} onClose={() => setStrokeKana(null)} />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Showing all {cards.length} selected sounds. Review your attempts from the Review page.
      </p>
    </div>
  );
}

function KanaDeskHeader({
  children,
  soundCount,
  onRestart,
}: {
  children: React.ReactNode;
  soundCount: number;
  onRestart: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5  dark:border-border dark:bg-card sm:p-7">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground">Japanese sound desk</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-foreground dark:text-foreground">Kana sprint.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Type romaji, then press Enter or Tab. Green cards are correct; red cards need another try.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm text-muted-foreground">{soundCount} sounds selected</p>
          <Button
            type="button"
            onClick={onRestart}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-muted"
          >
            Restart
          </Button>
        </div>
      </div>
      {children}
    </section>
  );
}

function KanaFilters({
  activeScripts,
  categories,
  order,
  onChangeOrder,
  onToggleCategory,
  onToggleScript,
}: {
  activeScripts: Set<Script>;
  categories: Set<KanaCategory>;
  order: Order;
  onChangeOrder: (order: Order) => void;
  onToggleCategory: (category: KanaCategory) => void;
  onToggleScript: (script: Script) => void;
}) {
  return (
    <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
      <Filter label="Script">
        {scripts.map((script) => (
          <Chip key={script} active={activeScripts.has(script)} onClick={() => onToggleScript(script)}>
            {script}
          </Chip>
        ))}
      </Filter>

      <Filter label="What to test">
        {categoryOptions.map(({ id, label }) => (
          <Chip key={id} active={categories.has(id)} onClick={() => onToggleCategory(id)}>
            {label}
          </Chip>
        ))}
      </Filter>

      <Filter label="Card order">
        <Chip active={order === "random"} onClick={() => onChangeOrder("random")}>
          Random
        </Chip>
        <Chip active={order === "ordered"} onClick={() => onChangeOrder("ordered")}>
          Ordered
        </Chip>
        <span className="self-center text-xs text-muted-foreground">
          {order === "random" ? "Click Random again to reshuffle without losing progress." : "Follow the selected chart in sequence."}
        </span>
      </Filter>
    </div>
  );
}

function KanaDrillCard({
  card,
  hasStrokeOrder,
  onCheck,
  onShowStrokeOrder,
  onSubmit,
  onUpdate,
}: {
  card: DrillCard;
  hasStrokeOrder: boolean;
  onCheck: (card: DrillCard) => void;
  onShowStrokeOrder: (kana: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, card: DrillCard) => void;
  onUpdate: (id: string, change: Partial<DrillCard>) => void;
}) {
  const cardClassName =
    card.status === "correct"
      ? "border-success/40 bg-success/20 text-foreground"
      : card.status === "wrong"
        ? "border-ring bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground";

  return (
    <article className={`flex min-h-64 flex-col justify-between rounded-lg border p-4  transition-colors ${cardClassName}`}>
      <div className="flex justify-end gap-1">
        {hasStrokeOrder ? (
          <Button
            type="button"
            onClick={() => onShowStrokeOrder(card.item.kana)}
            aria-label={`Show ${card.item.kana} stroke order`}
            className="rounded p-1.5 text-base hover:bg-background/10"
          >
            書
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => onUpdate(card.id, { revealed: !card.revealed })}
          aria-label={card.revealed ? "Hide answer" : "Show answer"}
          className="rounded p-1.5 hover:bg-background/10"
        >
          {card.revealed ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>

      <p className="text-center text-6xl sm:text-7xl">{card.item.kana}</p>

      <form onSubmit={(event) => onSubmit(event, card)}>
        <label className="sr-only" htmlFor={card.id}>
          Romaji for {card.item.kana}
        </label>
        <Input
          id={card.id}
          value={card.value}
          onChange={(event) => onUpdate(card.id, { value: event.target.value, status: "idle" })}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              onCheck(card);
            }
          }}
          autoComplete="off"
          spellCheck={false}
          disabled={card.status === "correct"}
          className="h-12 text-center font-mono text-lg disabled:cursor-default"
        />
        {card.revealed ? (
          <p className="mt-2 animate-answer-reveal text-center font-mono text-sm font-semibold motion-reduce:animate-none">
            {card.item.romaji}
          </p>
        ) : null}
        <p className={`mt-2 min-h-4 text-center text-xs font-semibold ${statusTextClassName(card.status)}`}>
          {card.status === "correct" ? "Correct" : card.status === "wrong" ? "Try again." : "Answer checked"}
        </p>
      </form>
    </article>
  );
}

function StrokeOrderDialog({ imageUrl, kana, onClose }: { imageUrl: string; kana: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open)=>{if(!open)onClose()}}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{kana} stroke order</DialogTitle></DialogHeader>
        <Image
          src={imageUrl}
          alt={`Stroke order for ${kana}`}
          width={640}
          height={640}
          unoptimized
          className="mx-auto mt-5 h-auto max-h-[65vh] w-auto rounded-lg"
        />
    </DialogContent></Dialog>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-ring bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

function toggleSetValue<T>(current: Set<T>, value: T) {
  const next = new Set(current);
  if (next.has(value) && next.size > 1) next.delete(value);
  else next.add(value);
  return next;
}

function statusTextClassName(status: Status) {
  if (status === "correct") return "text-foreground";
  if (status === "wrong") return "text-foreground";
  return "text-transparent";
}
