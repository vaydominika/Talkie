import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWeekLabel, getWeekKey, isWeakAttempt, summarizeWeakWords } from "@/lib/vocabulary-review";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attempts = await prisma.vocabularyReviewAttempt.findMany({
    where: { userId: session.user.id },
    include: {
      language: { select: { name: true } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const days = new Set(attempts.map((attempt) => attempt.createdAt.toDateString()));
  const words = new Set(attempts.map((attempt) => attempt.vocabularyEntryId));
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const missed = attempts.length - correct;
  const hintUsed = attempts.filter((attempt) => attempt.usedHint).length;
  const weakSummaries = summarizeWeakWords(attempts);
  const activeWeakCount = weakSummaries.filter((summary) => !summary.cleared).length;
  const byLanguage = new Map<string, { attempts: number; correct: number }>();
  const currentWeekKey = getWeekKey(new Date());
  const weeklyWeak = new Map<
    string,
    Map<
      string,
      {
        vocabularyEntryId: string;
        displayForm: string;
        language: string;
        group: string | null;
        missedCount: number;
        hintUsedCount: number;
        severity: number;
        lastAnswer: string;
        lastAttemptAt: Date;
      }
    >
  >();
  const activeWeakIds = new Set(weakSummaries.filter((summary) => !summary.cleared).map((summary) => summary.vocabularyEntryId));

  for (const attempt of attempts) {
    const current = byLanguage.get(attempt.language.name) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    if (attempt.correct) current.correct += 1;
    byLanguage.set(attempt.language.name, current);

    if (!isWeakAttempt(attempt)) continue;
    const weekKey = getWeekKey(attempt.createdAt);
    const week = weeklyWeak.get(weekKey) ?? new Map();
    const currentWord = week.get(attempt.vocabularyEntryId) ?? {
      vocabularyEntryId: attempt.vocabularyEntryId,
      displayForm: attempt.displayForm,
      language: attempt.language.name,
      group: attempt.group?.name ?? null,
      missedCount: 0,
      hintUsedCount: 0,
      severity: 0,
      lastAnswer: attempt.answer,
      lastAttemptAt: attempt.createdAt,
    };
    currentWord.missedCount += attempt.correct ? 0 : 1;
    currentWord.hintUsedCount += attempt.usedHint ? 1 : 0;
    currentWord.severity = currentWord.missedCount * 2 + currentWord.hintUsedCount;
    if (attempt.createdAt > currentWord.lastAttemptAt) {
      currentWord.lastAnswer = attempt.answer;
      currentWord.lastAttemptAt = attempt.createdAt;
    }
    week.set(attempt.vocabularyEntryId, currentWord);
    weeklyWeak.set(weekKey, week);
  }
  const weeklySections = [...weeklyWeak.entries()]
    .map(([weekKey, wordsById]) => ({
      weekKey,
      label: formatWeekLabel(weekKey),
      words: [...wordsById.values()].sort((a, b) => {
        if (a.severity !== b.severity) return b.severity - a.severity;
        return b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime();
      }),
    }))
    .sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Stats</h1>
        <p className="mt-1 text-muted-foreground">Your review activity across personal and group vocabulary.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-5">
        <Metric label="Days learned" value={days.size} />
        <Metric label="New words" value={words.size} />
        <Metric label="Correct" value={correct} />
        <Metric label="Missed" value={missed} />
        <Metric label="Weak" value={activeWeakCount} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">By language</p>
            <div className="mt-4 space-y-3">
              {[...byLanguage.entries()].map(([language, stat]) => (
                <div key={language} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{language}</span>
                  <span className="text-muted-foreground">
                    {stat.correct}/{stat.attempts} correct
                  </span>
                </div>
              ))}
              {byLanguage.size === 0 && <p className="text-sm text-muted-foreground">No review attempts yet.</p>}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Recent answers</p>
            <div className="mt-4 space-y-3">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{attempt.displayForm}</span>
                  <span className={attempt.usedHint ? "text-amber-700" : attempt.correct ? "text-[#4a5b3b]" : "text-rose-700"}>
                    {attempt.usedHint ? "Hint used" : attempt.correct ? "Correct" : "Missed"}
                  </span>
                </div>
              ))}
              {attempts.length === 0 && <p className="text-sm text-muted-foreground">Practice from a language Review tab to start tracking stats.</p>}
            </div>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Weekly weak review</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Weak means hint used and/or incorrect. Older weak words stay active until answered correctly without a hint.
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge tone="rose">{missed} missed</Badge>
              <Badge tone="amber">{hintUsed} hint used</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {weeklySections.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No weak review history yet. Missed answers and hint-used answers will collect here.
            </p>
          ) : (
            <div className="space-y-3">
              {weeklySections.map((section, index) => {
                const sectionMissed = section.words.reduce((sum, word) => sum + word.missedCount, 0);
                const sectionHints = section.words.reduce((sum, word) => sum + word.hintUsedCount, 0);
                return (
                  <details key={section.weekKey} className="rounded-lg border" open={index === 0}>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="font-medium">{section.weekKey === currentWeekKey ? "This week" : `Week of ${section.label}`}</span>
                      <span className="text-sm text-muted-foreground">
                        {section.words.length} weak words · {sectionMissed} missed · {sectionHints} hint used
                      </span>
                    </summary>
                    <div className="overflow-x-auto border-t">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-left">
                          <tr>
                            <th className="p-3">Word</th>
                            <th className="p-3">Space</th>
                            <th className="p-3">Missed</th>
                            <th className="p-3">Hint used</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Last answer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.words.map((word) => {
                            const active = activeWeakIds.has(word.vocabularyEntryId);
                            return (
                              <tr key={word.vocabularyEntryId} className="border-t">
                                <td className="p-3 font-medium">{word.displayForm}</td>
                                <td className="p-3 text-muted-foreground">{word.group ? `${word.group} · ${word.language}` : word.language}</td>
                                <td className="p-3">{word.missedCount}</td>
                                <td className="p-3">{word.hintUsedCount}</td>
                                <td className="p-3">
                                  <Badge tone={word.severity > 3 ? "red" : word.missedCount > 0 ? "rose" : "amber"}>
                                    {word.severity}
                                  </Badge>
                                </td>
                                <td className="p-3">{active ? <Badge tone="rose">Active weak</Badge> : <Badge tone="green">Cleared</Badge>}</td>
                                <td className="p-3 text-right text-muted-foreground">{word.lastAnswer || "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{label}</p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Badge({ tone, children }: { tone: "amber" | "green" | "red" | "rose"; children: React.ReactNode }) {
  const className =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "green"
        ? "border-[#d6dfca] bg-[#e5ebdf] text-[#4a5b3b]"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-rose-200 bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
