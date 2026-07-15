import type { StudyDay } from "@/lib/study-week";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function StudyWeek({ days }: { days: StudyDay[] }) {
  return <Card aria-labelledby="study-week-title">
    <CardHeader className="flex-row flex-wrap items-end justify-between gap-2">
      <div><CardTitle id="study-week-title">This week</CardTitle><p className="mt-1 text-xs text-muted-foreground">Your study rhythm, Monday to Sunday.</p></div>
      <div className="flex gap-3 text-[11px] text-muted-foreground"><Key color="bg-emerald-500" label="Complete"/><Key color="bg-amber-500" label="Started"/><Key color="bg-destructive" label="No time"/></div>
    </CardHeader>
    <CardContent className="grid grid-cols-7 gap-2">
      {days.map(day=>{
        const color=day.status==="complete"?"bg-emerald-500 ring-emerald-100":day.status==="partial"?"bg-amber-500 ring-amber-100":day.status==="empty"?"bg-destructive ring-destructive/15":"bg-muted ring-transparent";
        const minutes=Math.floor(day.focusedSeconds/60);
        const tooltip=`${minutes} minutes focused · ${day.wordCount} words learned`;
        return <div key={day.dateKey} className="flex flex-col items-center gap-2">
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`${day.label}: ${tooltip}`} className={`h-5 w-5 rounded-full p-0 ring-4 ${color}`}/></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{day.label}</span>
        </div>;
      })}
    </CardContent>
  </Card>;
}

function Key({color,label}:{color:string;label:string}) { return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`}/>{label}</span>; }
