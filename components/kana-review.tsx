"use client";

import { useEffect, useMemo, useState } from "react";
import { getKanaAttempts, type KanaAttempt } from "@/lib/kana-review";

export function KanaReview() {
  const [attempts, setAttempts] = useState<KanaAttempt[]>([]);

  useEffect(() => setAttempts(getKanaAttempts()), []);

  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  const missedAttempts = attempts.filter((attempt) => !attempt.correct);
  const missesByKana = useMemo(() => countMissesByKana(missedAttempts), [missedAttempts]);

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-stone-100">
      <KanaReviewHeader correctCount={correctCount} missedCount={missedAttempts.length} />
      <KanaReviewTable attempts={missedAttempts} missesByKana={missesByKana} />
    </section>
  );
}

function KanaReviewHeader({ correctCount, missedCount }: { correctCount: number; missedCount: number }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-400">Kana answer review</p>
        <h2 className="mt-1 font-serif text-2xl text-stone-50">What needs another look.</h2>
      </div>
      <div className="text-right text-sm">
        <p className="text-[#c7d4b9]">{correctCount} correct</p>
        <p className="font-semibold text-rose-300">{missedCount} mistakes</p>
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
    return <p className="mt-5 text-sm text-stone-300">No wrong kana answers yet. Your misses will collect here.</p>;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm text-stone-200">
        <thead className="border-b border-stone-700 text-left text-xs uppercase tracking-wide text-stone-400">
          <tr>
            <th className="pb-2">Kana</th>
            <th className="pb-2">Your answer</th>
            <th className="pb-2">Answer</th>
            <th className="pb-2">Misses</th>
            <th className="pb-2">Eye used</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => (
            <tr key={attempt.id} className="border-b border-stone-800 last:border-0">
              <td className="py-3 text-xl text-white">{attempt.kana}</td>
              <td className="py-3 font-mono text-stone-200">{attempt.answer || "-"}</td>
              <td className="py-3 font-mono font-semibold text-rose-200">{attempt.expected}</td>
              <td className="py-3 font-semibold text-rose-300">{missesByKana.get(attempt.kana)}</td>
              <td className="py-3 text-stone-300">{attempt.usedHint ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function countMissesByKana(attempts: KanaAttempt[]) {
  const counts = new Map<string, number>();
  attempts.forEach((attempt) => counts.set(attempt.kana, (counts.get(attempt.kana) ?? 0) + 1));
  return counts;
}
