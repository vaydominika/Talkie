"use client";

import { useEffect, useMemo, useState } from "react";
import { getVocabularyAttempts, type VocabularyAttempt } from "@/lib/vocabulary-review";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function VocabularyReview() {
  const [attempts, setAttempts] = useState<VocabularyAttempt[]>([]);
  useEffect(() => setAttempts(getVocabularyAttempts()), []);

  const good = attempts.filter((attempt) => attempt.correct).length;
  const bad = attempts.filter((attempt) => !attempt.correct);
  const missesByWord = useMemo(() => {
    const counts = new Map<string, number>();
    bad.forEach((attempt) => counts.set(attempt.wordId, (counts.get(attempt.wordId) ?? 0) + 1));
    return counts;
  }, [bad]);

  return (
    <section className="rounded-lg border border-border bg-card p-5 text-foreground">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ring">Vocabulary answer review</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">German and vocabulary misses.</h2>
        </div>
        <div className="text-right text-sm">
          <p className="text-success">{good} correct</p>
          <p className="font-semibold text-ring">{bad.length} mistakes</p>
        </div>
      </div>

      {bad.length ? (
        <div className="mt-5 overflow-x-auto">
          <Table className="w-full min-w-[48rem] text-sm text-foreground">
            <TableHeader className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <TableRow>
                <TableHead className="pb-2">Card</TableHead>
                <TableHead className="pb-2">Prompt</TableHead>
                <TableHead className="pb-2">Your answer</TableHead>
                <TableHead className="pb-2">Answer</TableHead>
                <TableHead className="pb-2">Misses</TableHead>
                <TableHead className="pb-2">Eye used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bad.map((attempt) => (
                <TableRow key={attempt.id} className="border-b border-border last:border-0">
                  <TableCell className="py-3 font-semibold text-primary-foreground">{attempt.displayForm}</TableCell>
                  <TableCell className="py-3 font-mono text-muted-foreground">{attempt.prompt}</TableCell>
                  <TableCell className="py-3 font-mono text-foreground">{attempt.answer || "-"}</TableCell>
                  <TableCell className="py-3 font-mono font-semibold text-ring">{attempt.expected}</TableCell>
                  <TableCell className="py-3 font-semibold text-ring">{missesByWord.get(attempt.wordId)}</TableCell>
                  <TableCell className="py-3 text-muted-foreground">{attempt.usedHint ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">No wrong vocabulary answers yet. German misses will collect here too.</p>
      )}
    </section>
  );
}
