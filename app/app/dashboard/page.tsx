import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
              <Input
                name="dailyMinutes"
                type="number"
                min={1}
                max={240}
                defaultValue={profile?.dailyMinutes ?? 15}
                className="w-24 text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground">min</span>
              <Button className="ml-auto" size="sm">Save</Button>
            </form>
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Today: {Math.floor((today?.focusedSeconds ?? 0) / 60)} focused minutes · {today?.focusSessions ?? 0} focus {(today?.focusSessions ?? 0) === 1 ? "session" : "sessions"}
            </p>
          </CardHeader>
        </Card>
      </section>

      <TodayStudyRibbon plan={plan} quests={quests} languages={languages} replacementOptions={replacementOptions} defaultLanguageId={attempts[0]?.languageId} defaultMinutes={Math.max(5, (profile?.dailyMinutes ?? 15) - Math.floor((today?.focusedSeconds ?? 0) / 60))} />

      <StudyWeek days={week} />

      {sessions.length > 0 && <Card><CardHeader><CardTitle>Today’s focus sessions</CardTitle></CardHeader><div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">{sessions.map((item) => <article key={item.id} className="rounded-lg bg-muted/40 p-3"><div className="flex justify-between text-sm"><span className="font-medium">{item.planItem?.title??item.lesson?.title??item.group?.name??item.language?.name??"Open focus"} · {Math.floor(item.focusedSeconds / 60)} min</span><span className="text-muted-foreground">{item.result?.toLowerCase() ?? "active"}</span></div>{item.recapNote && <p className="mt-2 text-sm text-muted-foreground">{item.recapNote}</p>}<div className="mt-2 flex items-center justify-between"><p className="text-xs text-muted-foreground">{item.effort ? `Effort ${item.effort}/5` : "No reflection yet"}</p><form action={reopenFocusRecap}><input type="hidden" name="sessionId" value={item.id}/><Button variant="link" size="sm" className="h-auto px-0">Open recap</Button></form></div></article>)}</div></Card>}

      {reflection && <Card className="bg-muted"><CardHeader><p className="section-label">Last week</p><CardTitle>Weekly reflection</CardTitle></CardHeader><div className="grid grid-cols-2 gap-3 px-5 sm:grid-cols-4">{Object.entries(reflection.metrics as Record<string, string|number>).map(([label, value]) => <div key={label} className="rounded-lg bg-background p-3"><p className="text-xs capitalize text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div>{!reflection.acceptedAt && <form action={acceptWeeklyTarget} className="flex flex-wrap items-end gap-2 p-5"><input type="hidden" name="reflectionId" value={reflection.id} /><label className="text-sm font-medium">Suggested daily target<Input name="minutes" type="number" min="1" max="240" defaultValue={reflection.suggestedDailyMinutes} className="mt-1 w-24" /></label><Button variant="accent">Use next week</Button></form>}</Card>}

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
