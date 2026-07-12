import type { StudyDay } from "@/lib/study-week";

export function StudyWeek({ days }: { days: StudyDay[] }) {
  return (
    <section aria-labelledby="study-week-title" className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p id="study-week-title" className="text-sm font-semibold">This week</p><p className="mt-1 text-xs text-muted-foreground">Your study rhythm, Monday to Sunday.</p></div>
        <div className="flex gap-3 text-[11px] text-muted-foreground"><Key color="bg-emerald-500" label="Complete" /><Key color="bg-amber-500" label="Started" /><Key color="bg-rose-500" label="No time" /></div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const color = day.status === "complete" ? "bg-emerald-500 ring-emerald-100" : day.status === "partial" ? "bg-amber-500 ring-amber-100" : day.status === "empty" ? "bg-rose-500 ring-rose-100" : "bg-muted ring-transparent";
          const minutes = Math.floor(day.focusedSeconds / 60);
          const tooltip = `${minutes} minutes focused · ${day.wordCount} words learned`;
          return (
            <div key={day.dateKey} className="group relative flex flex-col items-center gap-2">
              <button type="button" aria-label={`${day.label}: ${tooltip}`} className={`h-5 w-5 rounded-full ring-4 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:scale-110 ${color}`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{day.label}</span>
              <span role="tooltip" className="pointer-events-none absolute bottom-full z-20 mb-2 hidden whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg group-hover:block group-focus-within:block">{minutes} minutes focused · {day.wordCount} words learned</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}
