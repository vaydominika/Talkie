import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { updateDailyMinutes } from "../settings/actions";
import { getStudyWeek } from "@/lib/study-week";
import { StudyWeek } from "@/components/study-week";
import { TodayStudyRibbon } from "@/components/today-study-ribbon";
import { ensureDailyQuests, ensureWeeklyReflection, userTimezone } from "@/lib/learning-loop";
import { dateKey } from "@/lib/timer";
import { acceptWeeklyTarget, reopenFocusRecap } from "./actions";
import { getStudyPlanReplacementOptions } from "@/lib/study-plan";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const timezone = await userTimezone(session.user.id);
  const todayKey = dateKey(new Date(), timezone);
  const [profile, attempts, activeLanguages, activeGroups, week, languages, plan, quests, reflection, sessions,replacementOptions] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.vocabularyReviewAttempt.findMany({
      where: { userId: session.user.id },
      select: { vocabularyEntryId: true, languageId: true, correct: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.userLanguage.count({ where: { userId: session.user.id } }),
    prisma.groupMember.count({ where: { userId: session.user.id } }),
    getStudyWeek(session.user.id),
    prisma.language.findMany({ where: { users: { some: { userId: session.user.id } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.studyPlan.findUnique({ where: { userId_dateKey: { userId: session.user.id, dateKey: todayKey } }, include: { items: { orderBy: { position: "asc" } } } }),
    ensureDailyQuests(session.user.id, timezone),
    ensureWeeklyReflection(session.user.id, timezone),
    prisma.focusStudySession.findMany({ where: { userId: session.user.id, dateKey: todayKey, focusedSeconds: { gte: 60 } }, include:{planItem:{select:{title:true}},language:{select:{name:true}},group:{select:{name:true}},lesson:{select:{title:true}}},orderBy: { startedAt: "desc" }, take: 8 }),
    getStudyPlanReplacementOptions(session.user.id),
  ]);

  const dayKeys = new Set(attempts.map((attempt) => attempt.createdAt.toDateString()));
  const practicedWords = new Set(attempts.map((attempt) => attempt.vocabularyEntryId));
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const today = week.find((day) => day.isToday);

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
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Today: {Math.floor((today?.focusedSeconds ?? 0) / 60)} focused minutes · {today?.focusSessions ?? 0} focus {(today?.focusSessions ?? 0) === 1 ? "session" : "sessions"}
            </p>
          </CardHeader>
        </Card>
      </section>

      <TodayStudyRibbon plan={plan} quests={quests} languages={languages} replacementOptions={replacementOptions} defaultLanguageId={attempts[0]?.languageId} defaultMinutes={Math.max(5, (profile?.dailyMinutes ?? 15) - Math.floor((today?.focusedSeconds ?? 0) / 60))} />

      <StudyWeek days={week} />

      {sessions.length > 0 && <section className="rounded-xl border p-5"><h2 className="font-semibold">Today’s focus sessions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{sessions.map((item) => <article key={item.id} className="rounded-lg bg-muted/40 p-3"><div className="flex justify-between text-sm"><span className="font-medium">{item.planItem?.title??item.lesson?.title??item.group?.name??item.language?.name??"Open focus"} · {Math.floor(item.focusedSeconds / 60)} min</span><span className="text-muted-foreground">{item.result?.toLowerCase() ?? "active"}</span></div>{item.recapNote && <p className="mt-2 text-sm text-muted-foreground">{item.recapNote}</p>}<div className="mt-2 flex items-center justify-between"><p className="text-xs text-muted-foreground">{item.effort ? `Effort ${item.effort}/5` : "No reflection yet"}</p><form action={reopenFocusRecap}><input type="hidden" name="sessionId" value={item.id}/><button className="text-xs text-rose-700 underline">Open recap</button></form></div></article>)}</div></section>}

      {reflection && <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-700">Last week</p><h2 className="mt-1 text-xl font-semibold">Weekly reflection</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(reflection.metrics as Record<string, string|number>).map(([label, value]) => <div key={label} className="rounded-lg bg-background p-3"><p className="text-xs capitalize text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div>{!reflection.acceptedAt && <form action={acceptWeeklyTarget} className="mt-4 flex flex-wrap items-end gap-2"><input type="hidden" name="reflectionId" value={reflection.id} /><label className="text-sm font-medium">Suggested daily target<input name="minutes" type="number" min="1" max="240" defaultValue={reflection.suggestedDailyMinutes} className="ml-2 h-9 w-20 rounded-md border bg-background px-2" /></label><button className="h-9 rounded-md bg-indigo-600 px-3 text-sm font-medium text-white">Use next week</button></form>}</section>}

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
