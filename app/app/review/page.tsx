import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

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
  const byLanguage = new Map<string, { attempts: number; correct: number }>();

  for (const attempt of attempts) {
    const current = byLanguage.get(attempt.language.name) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    if (attempt.correct) current.correct += 1;
    byLanguage.set(attempt.language.name, current);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Stats</h1>
        <p className="mt-1 text-muted-foreground">Your review activity across personal and group vocabulary.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Metric label="Days learned" value={days.size} />
        <Metric label="New words" value={words.size} />
        <Metric label="Correct" value={correct} />
        <Metric label="Missed" value={missed} />
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
                  <span className={attempt.correct ? "text-[#4a5b3b]" : "text-rose-700"}>
                    {attempt.correct ? "Correct" : "Missed"}
                  </span>
                </div>
              ))}
              {attempts.length === 0 && <p className="text-sm text-muted-foreground">Practice from a language Review tab to start tracking stats.</p>}
            </div>
          </CardHeader>
        </Card>
      </section>
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
