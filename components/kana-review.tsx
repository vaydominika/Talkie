"use client";

import { useEffect, useMemo, useState } from "react";
import { getKanaAttempts, type KanaAttempt } from "@/lib/kana-review";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function KanaReview() {
  const [attempts, setAttempts] = useState<KanaAttempt[]>([]);

  useEffect(() => setAttempts(getKanaAttempts()), []);

  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  const missedAttempts = attempts.filter((attempt) => !attempt.correct);
  const missesByKana = useMemo(() => countMissesByKana(missedAttempts), [missedAttempts]);

  return (
    <section className="rounded-lg border border-border bg-card p-5 text-foreground">
      <KanaReviewHeader correctCount={correctCount} missedCount={missedAttempts.length} />
      <KanaReviewTable attempts={missedAttempts} missesByKana={missesByKana} />
    </section>
  );
}

function KanaReviewHeader({ correctCount, missedCount }: { correctCount: number; missedCount: number }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ring">Kana answer review</p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">What needs another look.</h2>
      </div>
      <div className="text-right text-sm">
        <p className="text-success">{correctCount} correct</p>
        <p className="font-semibold text-ring">{missedCount} mistakes</p>
      </div>
    </div>
  );
}

function KanaReviewTable({
  attempts,
  missesByKana,
}: {
  attempts: KanaAttempt[];
  missesByKana: Map<string, number>;
}) {
  if (!attempts.length) {
    return <p className="mt-5 text-sm text-muted-foreground">No wrong kana answers yet. Your misses will collect here.</p>;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <Table className="w-full min-w-[36rem] text-sm text-foreground">
        <TableHeader className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
          <TableRow>
            <TableHead className="pb-2">Kana</TableHead>
            <TableHead className="pb-2">Your answer</TableHead>
            <TableHead className="pb-2">Answer</TableHead>
            <TableHead className="pb-2">Misses</TableHead>
            <TableHead className="pb-2">Eye used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((attempt) => (
            <TableRow key={attempt.id} className="border-b border-border last:border-0">
              <TableCell className="py-3 text-xl text-primary-foreground">{attempt.kana}</TableCell>
              <TableCell className="py-3 font-mono text-foreground">{attempt.answer || "-"}</TableCell>
              <TableCell className="py-3 font-mono font-semibold text-ring">{attempt.expected}</TableCell>
              <TableCell className="py-3 font-semibold text-ring">{missesByKana.get(attempt.kana)}</TableCell>
              <TableCell className="py-3 text-muted-foreground">{attempt.usedHint ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function countMissesByKana(attempts: KanaAttempt[]) {
  const counts = new Map<string, number>();
  attempts.forEach((attempt) => counts.set(attempt.kana, (counts.get(attempt.kana) ?? 0) + 1));
  return counts;
}
