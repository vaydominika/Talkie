"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge as UiBadge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
type StudyMode = "all" | "weak" | "due";
type Card = { word: Word; direction: Exclude<Direction, "random"> };
type AttemptAction = (formData: FormData) => unknown | Promise<unknown>;
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
  rateReviewAction,
  dueIds = new Set<string>(),
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
  rateReviewAction?: AttemptAction;
  dueIds?: Set<string>;
}) {
  const selectedWords = useMemo(() => words.filter((word) => selectedIds.has(word.id)), [words, selectedIds]);
  const selectedWordKey = useMemo(() => selectedWords.map((word) => word.id).join("|"), [selectedWords]);
  const [localReviewAttempts, setLocalReviewAttempts] = useState<ReviewAttempt[]>(reviewAttempts);
  useEffect(() => setLocalReviewAttempts(reviewAttempts), [reviewAttempts]);
  const weakSummaries = useMemo(() => summarizeWeakWords(localReviewAttempts), [localReviewAttempts]);
  const activeWeakSummaries = useMemo(() => weakSummaries.filter((summary) => !summary.cleared), [weakSummaries]);
  const weakSummaryByWordId = useMemo(
    () => new Map(activeWeakSummaries.map((summary) => [summary.vocabularyEntryId, summary])),
    [activeWeakSummaries],
  );
  const weakWordIds = useMemo(() => new Set(activeWeakSummaries.map((summary) => summary.vocabularyEntryId)), [activeWeakSummaries]);
  const weakWordKey = useMemo(() => activeWeakSummaries.map((summary) => summary.vocabularyEntryId).join("|"), [activeWeakSummaries]);
  const [direction, setDirection] = useState<Direction>("target-native");
  const searchParams=useSearchParams();
  const requestedMode=searchParams.get("mode");
  const [studyMode, setStudyMode] = useState<StudyMode>(requestedMode==="due"||requestedMode==="weak"?requestedMode:"all");
  const [ratingState,setRatingState]=useState<{busy:boolean;message:string;error:string}>({busy:false,message:"",error:""});
  const [randomOrder, setRandomOrder] = useState(true);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [revealed, setRevealed] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const practiceWords = useMemo(
    () => studyMode === "weak" ? selectedWords.filter((word) => weakWordIds.has(word.id)) : studyMode === "due" ? selectedWords.filter((word)=>dueIds.has(word.id)) : selectedWords,
    [selectedWords, studyMode, weakWordIds, dueIds],
  );
  const deckRebuildKey = studyMode === "weak" ? `${selectedWordKey}|${weakWordKey}` : studyMode === "due" ? `${selectedWordKey}|${[...dueIds].join("|")}` : selectedWordKey;

  const rebuild = (nextDirection = direction, nextRandomOrder = randomOrder, nextStudyMode = studyMode) => {
    setDirection(nextDirection);
    setRandomOrder(nextRandomOrder);
    setStudyMode(nextStudyMode);
    const nextWords = nextStudyMode === "weak" ? selectedWords.filter((word) => weakWordIds.has(word.id)) : nextStudyMode === "due" ? selectedWords.filter((word)=>dueIds.has(word.id)) : selectedWords;
    setDeck(buildDeck(nextWords, nextDirection, nextRandomOrder));
    setIndex(0);
    setAnswer("");
    setStatus("idle");
    setRevealed(false);
  };

  useEffect(() => {
    if (status !== "idle") return;
    rebuild(direction, randomOrder, studyMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckRebuildKey, studyMode]);

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
    if (studyMode === "weak" && card && status !== "idle") {
      const shouldRepeat = status === "wrong" || revealed;
      setDeck((currentDeck) => {
        if (!currentDeck.length) return currentDeck;
        const activeIndex = index % currentDeck.length;
        const remaining = currentDeck.filter((_, cardIndex) => cardIndex !== activeIndex);
        return shouldRepeat ? [...remaining, currentDeck[activeIndex]] : remaining;
      });
      setIndex((current) => {
        if (deck.length <= 1) return 0;
        return Math.min(current, deck.length - 2);
      });
      return;
    }
    setIndex((current) => (deck.length ? (current + 1) % deck.length : 0));
  };

  const restartDeck = () => {
    rebuild();
  };

  const clearReviewHistory = () => {
    if (resetAttemptsAction && languageId) {
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
  const rateCard = async (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    if (card && rateReviewAction) { const data=new FormData(); data.set("wordId",card.word.id); data.set("rating",rating);setRatingState({busy:true,message:"",error:""});try{const result=await rateReviewAction(data) as {dueAt?:string;intervalDays?:number;state?:string}|undefined;const label=result?.intervalDays?`${result.intervalDays} day${result.intervalDays===1?"":"s"}`:result?.dueAt?new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(new Date(result.dueAt)):"soon";setRatingState({busy:false,message:`Next review: ${label}`,error:""});}catch(error){setRatingState({busy:false,message:"",error:error instanceof Error?error.message:"Could not save this rating."});}}
    next();
  };

  if (!selectedWords.length) {
    return (
      <section className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-xl font-semibold">No vocabulary flashcards yet.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Select words from the Vocabulary tab to practice them here.</p>
      </section>
    );
  }

  if (!practiceWords.length && status === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          <Toggle active={studyMode === "all"} onClick={() => rebuild(direction, randomOrder, "all")}>
            All
          </Toggle>
          <Toggle active={studyMode === "weak"} onClick={() => rebuild(direction, randomOrder, "weak")}>
            Weak
          </Toggle>
          <Toggle active={studyMode === "due"} onClick={() => rebuild(direction, randomOrder, "due")}>Due</Toggle>
          <Toggle active={randomOrder} onClick={() => rebuild(direction, !randomOrder, studyMode)}>
            {randomOrder ? "Random order" : "Ordered"}
          </Toggle>
        </div>
        <section className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-xl font-semibold">No {studyMode === "due" ? "due" : "weak"} words right now.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {studyMode === "due" ? "Rated words appear here when their scheduled review time arrives." : "Weak words appear here after a hint is used or an answer is missed, and stay until answered correctly without a hint."}
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
        <Toggle active={studyMode === "due"} onClick={() => rebuild(direction, randomOrder, "due")}>Due</Toggle>
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
        <Button type="button" variant="outline" onClick={restartDeck} className="rounded-full px-3 py-1.5 text-sm font-medium">
          Restart deck
        </Button>
        {resetAttemptsAction && languageId ? (
          <Button type="button" variant="outline" onClick={() => setClearConfirmOpen(true)} className="rounded-full">
            Clear review history
          </Button>
        ) : null}
      </div>

      <section className="mx-auto max-w-xl rounded-lg border border-ring bg-accent p-6 text-center text-accent-foreground">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-foreground">Vocabulary sprint</p>
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
          <p className="text-5xl font-semibold text-accent-foreground">{prompt}</p>
          {card?.direction === "target-native" && card.word.displayForm && (
            <SpeakButton text={card.word.displayForm} locale={activeSpeechLocale} voiceName={activeSpeechVoiceName} provider={activeSpeechProvider} className="h-9 w-9 border-ring text-accent-foreground" />
          )}
        </div>
        {card?.direction === "target-native" && card.word.japanese?.kana && <p className="mt-2 text-lg text-accent-foreground/70">{card.word.japanese.kana}</p>}
        {helper && <p className="mt-3 text-sm font-medium text-accent-foreground/70">[{helper}]</p>}

        <form onSubmit={submit} className="mt-7">
          <Input
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setStatus("idle");
            }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className={`h-14 border-ring! bg-background/90 text-center font-mono text-xl ${
              status === "correct"
                ? "bg-success/15 focus:ring-success/30"
                : status === "wrong"
                  ? "bg-destructive/10 focus:ring-destructive/30"
                  : "focus:ring-ring/40"
            }`}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => setRevealed((value) => !value)} className="rounded-md px-3 py-2 text-sm font-medium">
              {revealed ? "Hide answer" : "Reveal answer"}
            </Button>
            {status !== "idle" && rateReviewAction && <div><div className="flex flex-wrap justify-center gap-2">{(["AGAIN","HARD","GOOD","EASY"] as const).map(rating=><Button disabled={ratingState.busy} key={rating} type="button" variant={rating==="AGAIN"?"destructive":rating==="GOOD"?"accent":"secondary"} size="sm" onClick={()=>rateCard(rating)}>{rating[0]+rating.slice(1).toLowerCase()}</Button>)}</div>{ratingState.message&&<p className="mt-2 text-center text-xs text-emerald-700" aria-live="polite">{ratingState.message}</p>}{ratingState.error&&<p className="mt-2 text-center text-xs text-destructive" role="alert">{ratingState.error}</p>}</div>}
            <Button type="button" variant="outline" onClick={next} className="rounded-md px-3 py-2 text-sm font-medium">
              Skip
            </Button>
          </div>
          {revealed && <p className="mt-3 animate-answer-reveal font-mono text-sm font-semibold text-accent-foreground">{expected}</p>}
          <p className={`mt-3 min-h-5 text-sm font-medium ${status === "correct" ? "text-success" : status === "wrong" ? "text-destructive" : "text-transparent"}`}>
            {status === "correct" ? "Correct. Press Enter again for the next card." : "Try again, or press Enter again for the next card."}
          </p>
        </form>
        <p className="mt-6 text-xs text-accent-foreground/70">
          {index + 1} / {deck.length} {studyMode === "weak" ? "weak" : studyMode === "due" ? "due" : "selected"} words
        </p>
      </section>
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear review history?</AlertDialogTitle><AlertDialogDescription>This removes missed and hint-used attempt history for this deck. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" onClick={()=>{setClearConfirmOpen(false);clearReviewHistory()}}>Clear history</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
          ? "border-border bg-muted text-foreground dark:border-border dark:bg-card dark:text-foreground"
          : "border-ring/40 bg-accent/30 text-foreground";

  return <UiBadge variant="outline" className={className}>{children}</UiBadge>;
}

function Toggle({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      variant={active ? "accent" : "outline"}
      className="rounded-full px-3 py-1.5 text-sm font-medium"
    >
      {children}
    </Button>
  );
}
