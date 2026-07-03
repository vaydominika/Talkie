"use client";

import { useEffect, useMemo, useState } from "react";
import { getKanaAttempts, type KanaAttempt } from "@/lib/kana-review";

type ReviewAttempt = {
  id: string;
  vocabularyEntryId: string;
  displayForm: string;
  prompt: string;
  expected: string;
  answer: string;
  correct: boolean;
  usedHint: boolean;
  createdAt: Date;
};

export function JapaneseReview({ reviewAttempts }: { reviewAttempts: ReviewAttempt[] }) {
  const [kanaAttempts, setKanaAttempts] = useState<KanaAttempt[]>([]);

  useEffect(() => setKanaAttempts(getKanaAttempts()), []);

  const kanaSprintMisses = kanaAttempts.filter((attempt) => !attempt.correct && (attempt.source === "sprint" || !attempt.source));
  const alphabetMisses = kanaAttempts.filter((attempt) => !attempt.correct && attempt.source === "flashcards");
  const vocabularyWeakAttempts = reviewAttempts.filter((attempt) => attempt.usedHint || !attempt.correct);

  const kanaSprintCounts = useKanaMissCounts(kanaSprintMisses);
  const alphabetCounts = useKanaMissCounts(alphabetMisses);
  const vocabularyCounts = useVocabularyWeakCounts(vocabularyWeakAttempts);

  return (
    <div className="space-y-6">
      <ReviewSection
        eyebrow="Kana sprint"
        title="Sound desk misses"
        correct={kanaAttempts.filter((attempt) => attempt.correct && (attempt.source === "sprint" || !attempt.source)).length}
        missed={kanaSprintMisses.length}
      >
        <KanaMissTable attempts={kanaSprintMisses} counts={kanaSprintCounts} empty="No wrong Kana sprint answers yet." />
      </ReviewSection>

      <ReviewSection
        eyebrow="Flashcards: alphabet"
        title="Kana flashcard misses"
        correct={kanaAttempts.filter((attempt) => attempt.correct && attempt.source === "flashcards").length}
        missed={alphabetMisses.length}
      >
        <KanaMissTable attempts={alphabetMisses} counts={alphabetCounts} empty="No wrong alphabet flashcard answers yet." />
      </ReviewSection>

      <ReviewSection
        eyebrow="Flashcards: words and sentences"
        title="Vocabulary weak words"
        correct={reviewAttempts.filter((attempt) => attempt.correct).length}
        missed={vocabularyWeakAttempts.length}
        missedLabel="weak"
      >
        <VocabularyWeakTable attempts={vocabularyWeakAttempts} counts={vocabularyCounts} />
      </ReviewSection>
    </div>
  );
}

function useKanaMissCounts(attempts: KanaAttempt[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    attempts.forEach((attempt) => counts.set(attempt.kana, (counts.get(attempt.kana) ?? 0) + 1));
    return counts;
  }, [attempts]);
}

function useVocabularyWeakCounts(attempts: ReviewAttempt[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    attempts.forEach((attempt) => counts.set(attempt.vocabularyEntryId, (counts.get(attempt.vocabularyEntryId) ?? 0) + 1));
    return counts;
  }, [attempts]);
}

function ReviewSection({
  eyebrow,
  title,
  correct,
  missed,
  missedLabel = "missed",
  children,
}: {
  eyebrow: string;
  title: string;
  correct: number;
  missed: number;
  missedLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-panel-in rounded-lg border p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-rose-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        </div>
        <div className="text-right text-sm">
          <p className="text-[#4a5b3b]">{correct} correct</p>
          <p className="font-semibold text-rose-700">
            {missed} {missedLabel}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function KanaMissTable({ attempts, counts, empty }: { attempts: KanaAttempt[]; counts: Map<string, number>; empty: string }) {
  if (!attempts.length) return <p className="mt-5 text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="pb-2">Kana</th>
            <th className="pb-2">Your answer</th>
            <th className="pb-2">Answer</th>
            <th className="pb-2">Misses</th>
            <th className="pb-2">Hint used</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => (
            <tr key={attempt.id} className="border-b last:border-0">
              <td className="py-3 text-xl font-semibold">{attempt.kana}</td>
              <td className="py-3 font-mono">{attempt.answer || "-"}</td>
              <td className="py-3 font-mono font-semibold text-rose-700">{attempt.expected}</td>
              <td className="py-3 font-semibold text-rose-700">{counts.get(attempt.kana)}</td>
              <td className="py-3 text-muted-foreground">{attempt.usedHint ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VocabularyWeakTable({ attempts, counts }: { attempts: ReviewAttempt[]; counts: Map<string, number> }) {
  if (!attempts.length) {
    return <p className="mt-5 text-sm text-muted-foreground">No weak vocabulary flashcard answers yet.</p>;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="pb-2">Card</th>
            <th className="pb-2">Prompt</th>
            <th className="pb-2">Your answer</th>
            <th className="pb-2">Answer</th>
            <th className="pb-2">Weak count</th>
            <th className="pb-2">Why weak</th>
            <th className="pb-2 text-right">Date</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => (
            <tr key={attempt.id} className="border-b last:border-0">
              <td className="py-3 font-semibold">{attempt.displayForm}</td>
              <td className="py-3 font-mono text-muted-foreground">{attempt.prompt}</td>
              <td className="py-3 font-mono">{attempt.answer || "-"}</td>
              <td className="py-3 font-mono font-semibold text-rose-700">{attempt.expected}</td>
              <td className="py-3 font-semibold text-rose-700">{counts.get(attempt.vocabularyEntryId)}</td>
              <td className="py-3 text-muted-foreground">{weakReason(attempt)}</td>
              <td className="py-3 text-right text-xs text-muted-foreground">{new Date(attempt.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function weakReason(attempt: ReviewAttempt) {
  if (attempt.usedHint && !attempt.correct) return "Missed + hint";
  if (attempt.usedHint) return "Hint used";
  return "Missed";
}
