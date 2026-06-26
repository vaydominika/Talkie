import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { updateDailyMinutes } from "../settings/actions";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [profile, attempts, activeLanguages, activeGroups] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.vocabularyReviewAttempt.findMany({
      where: { userId: session.user.id },
      select: { vocabularyEntryId: true, correct: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.userLanguage.count({ where: { userId: session.user.id } }),
    prisma.groupMember.count({ where: { userId: session.user.id } }),
  ]);

  const dayKeys = new Set(attempts.map((attempt) => attempt.createdAt.toDateString()));
  const practicedWords = new Set(attempts.map((attempt) => attempt.vocabularyEntryId));
  const correct = attempts.filter((attempt) => attempt.correct).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Your daily study</h1>
        <p className="mt-1 text-muted-foreground">A quiet snapshot of today&apos;s pace and your recent practice.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Days learned" value={dayKeys.size} />
          <Metric label="New words" value={practicedWords.size} />
          <Metric label="Correct answers" value={correct} />
          <Metric label="Active spaces" value={activeLanguages + activeGroups} />
        </div>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Daily target</p>
            <form action={updateDailyMinutes} className="mt-3 flex items-center gap-2">
              <input
                name="dailyMinutes"
                type="number"
                min={1}
                max={240}
                defaultValue={profile?.dailyMinutes ?? 15}
                className="h-10 w-24 rounded-md border bg-background px-3 text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground">min</span>
              <button className="ml-auto rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Save</button>
            </form>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Languages</p>
            <CardTitle className="text-3xl">{activeLanguages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Groups</p>
            <CardTitle className="text-3xl">{activeGroups}</CardTitle>
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
