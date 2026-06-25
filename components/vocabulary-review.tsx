"use client";

import { useEffect, useMemo, useState } from "react";
import { getVocabularyAttempts, type VocabularyAttempt } from "@/lib/vocabulary-review";

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
    <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-stone-100">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-400">Vocabulary answer review</p>
          <h2 className="mt-1 font-serif text-2xl text-stone-50">German and vocabulary misses.</h2>
        </div>
        <div className="text-right text-sm">
          <p className="text-[#c7d4b9]">{good} correct</p>
          <p className="font-semibold text-rose-300">{bad.length} mistakes</p>
        </div>
      </div>

      {bad.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm text-stone-200">
            <thead className="border-b border-stone-700 text-left text-xs uppercase tracking-wide text-stone-400">
              <tr>
                <th className="pb-2">Card</th>
                <th className="pb-2">Prompt</th>
                <th className="pb-2">Your answer</th>
                <th className="pb-2">Answer</th>
                <th className="pb-2">Misses</th>
                <th className="pb-2">Eye used</th>
              </tr>
            </thead>
            <tbody>
              {bad.map((attempt) => (
                <tr key={attempt.id} className="border-b border-stone-800 last:border-0">
                  <td className="py-3 font-semibold text-white">{attempt.displayForm}</td>
                  <td className="py-3 font-mono text-stone-300">{attempt.prompt}</td>
                  <td className="py-3 font-mono text-stone-200">{attempt.answer || "-"}</td>
                  <td className="py-3 font-mono font-semibold text-rose-200">{attempt.expected}</td>
                  <td className="py-3 font-semibold text-rose-300">{missesByWord.get(attempt.wordId)}</td>
                  <td className="py-3 text-stone-300">{attempt.usedHint ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 text-sm text-stone-300">No wrong vocabulary answers yet. German misses will collect here too.</p>
      )}
    </section>
  );
}
