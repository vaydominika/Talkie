"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Circle, Headphones, RefreshCcw, Repeat2, Sparkles, Trash2 } from "lucide-react";
import { generateStudyPlan, updateStudyPlanItem } from "@/app/app/dashboard/actions";
import { useTimer } from "@/components/timer-provider";
import { AppModal } from "@/components/app-modal";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type PlanItem={ id: string; title: string; description: string | null; href: string | null; estimatedMinutes: number; status: "PENDING" | "COMPLETED" | "REMOVED"; type: string; referenceId:string|null;metadata:unknown};
type Plan = { id: string; durationMinutes: number; languageId: string | null; items: PlanItem[] } | null;
type Quest = { id: string; title: string; target: number; progress: number; completedAt: Date | null };
type ReplacementOption={id:string;type:string;title:string;description:string;context:string};

export function TodayStudyRibbon({ plan, quests, languages,replacementOptions, defaultMinutes, defaultLanguageId }: { plan: Plan; quests: Quest[]; languages: { id: string; name: string }[];replacementOptions:ReplacementOption[]; defaultMinutes: number; defaultLanguageId?:string }) {
  const {snapshot,mutate,setOpen,busy}=useTimer();
  const router=useRouter();
  const [launch,setLaunch]=useState<PlanItem|null>(null);
  const [replace,setReplace]=useState<PlanItem|null>(null);
  const [launchError,setLaunchError]=useState("");
  const [replacementError,setReplacementError]=useState("");
  const liveQuests=snapshot?.quests??quests;
  const visibleItems = plan?.items.filter((item) => item.status !== "REMOVED") ?? [];
  const completed = visibleItems.filter((item) => item.status === "COMPLETED").length;
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b px-5 py-4">
        <div><p className="section-label">Today</p><h2 className="mt-1 text-xl font-semibold">Your study thread</h2><p className="mt-1 text-sm text-muted-foreground">A flexible route through the work that matters today.</p></div>
        <form action={generateStudyPlan} className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5"><Label>Minutes</Label><FormSelect ariaLabel="Minutes" name="durationMinutes" defaultValue={String(plan?.durationMinutes ?? defaultMinutes)} className="w-36" options={Array.from(new Set([15,30,45,60,defaultMinutes])).map(minutes=>({value:String(minutes),label:<>{minutes}{minutes===defaultMinutes?" remaining":""}</>}))}/></div>
          <div className="grid gap-1.5"><Label>Language</Label><FormSelect ariaLabel="Language" name="languageId" defaultValue={plan?.languageId ?? defaultLanguageId ?? ""} className="w-44" options={[{value:"",label:"All languages"},...languages.map(language=>({value:language.id,label:language.name}))]}/></div>
          <Button variant="accent"><RefreshCcw />{plan ? "Regenerate" : "Build plan"}</Button>
        </form>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-h-0 flex-col gap-2">
          {visibleItems.map((item, index) => <div key={item.id} className={`flex items-center gap-3 rounded-lg border bg-background/80 p-3 ${item.status === "COMPLETED" ? "opacity-60" : ""}`}>
            <form action={updateStudyPlanItem}><input type="hidden" name="itemId" value={item.id} /><Button size="icon-sm" variant="ghost" name="command" value="complete" aria-label={item.status === "COMPLETED" ? "Mark pending" : "Mark complete"} className="text-success">{item.status === "COMPLETED" ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</Button></form>
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1"><p className={`font-medium ${item.status === "COMPLETED" ? "line-through" : ""}`}>{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.description}</p></div>
            <span className="text-xs text-muted-foreground">{item.estimatedMinutes} min</span>
            <form action={updateStudyPlanItem} className="flex"><input type="hidden" name="itemId" value={item.id} /><Button size="icon-sm" variant="ghost" name="command" value="up" aria-label="Move up" className="text-muted-foreground"><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="icon-sm" variant="ghost" name="command" value="down" aria-label="Move down" className="text-muted-foreground"><ArrowDown className="h-3.5 w-3.5" /></Button></form>
            <Button type="button" size="xs" variant="outline" onClick={()=>{setLaunchError("");if(snapshot?.group){setLaunchError("Leave the active group timer before starting a personal plan item.");return;}setLaunch(item);}}>Start</Button>
            <Button type="button" size="icon-xs" variant="ghost" onClick={()=>{setReplacementError("");setReplace(item)}} aria-label="Replace plan item"><Repeat2/></Button>
            <form action={updateStudyPlanItem}><input type="hidden" name="itemId" value={item.id} /><Button size="icon-sm" variant="ghost" name="command" value="remove" aria-label="Remove item" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></form>
          </div>)}
          {!plan && <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"><Sparkles className="h-5 w-5 text-ring" /><p className="mt-2 text-sm font-medium">Build a plan that fits today.</p></div>}
          {plan && !visibleItems.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Everything was removed. Regenerate when you want a fresh route.</p>}
          {plan && <p className="pt-1 text-xs text-muted-foreground">{completed} of {visibleItems.length} activities complete</p>}{launchError&&<p role="alert" className="text-xs text-foreground">{launchError}</p>}
        </div>
        <aside className="rounded-lg border bg-background/75 p-4"><div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-ring" /><h3 className="text-sm font-semibold">Daily quests</h3></div><p className="mt-1 text-xs text-muted-foreground">Complete any two.</p><div className="mt-4 space-y-3">{liveQuests.map((quest) => <div key={quest.id}><div className="flex justify-between gap-2 text-xs"><span>{quest.title}</span><span className="text-muted-foreground">{quest.progress}/{quest.target}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${quest.completedAt ? "bg-success" : "bg-accent"}`} style={{ width: `${Math.min(100, quest.progress / quest.target * 100)}%` }} /></div></div>)}</div></aside>
      </div>
      {launch&&<AppModal title="Start this focus item?" description={`${launch.estimatedMinutes} minutes · ${launch.title}`} onClose={()=>setLaunch(null)}><div className="rounded-lg border bg-muted/40 p-4"><p className="font-medium">{launch.title}</p><p className="mt-1 text-sm text-muted-foreground">{launch.description}</p></div>{launchError&&<p role="alert" className="mt-3 text-sm text-foreground">{launchError}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" onClick={()=>setLaunch(null)}>Cancel</Button><Button disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={async()=>{setLaunchError("");const metadata=(launch.metadata&&typeof launch.metadata==="object"?launch.metadata:{}) as Record<string,string>;const destination=launch.href||"/app/dashboard";const prepared=await mutate({action:"prepare",planItemId:launch.id,plannedMinutes:launch.estimatedMinutes,languageId:metadata.languageId,lessonId:launch.type==="LESSON"?launch.referenceId:undefined,destination});if(!prepared){setLaunchError("The timer could not be prepared.");return;}const started=await mutate({action:"personal",groupId:"start"});if(!started){setLaunchError("The timer could not start.");return;}setLaunch(null);setOpen(true);router.push(destination);router.refresh();}}>Start focus</Button></div></AppModal>}
      {replace&&<AppModal title="Replace plan item" description="Choose work that is available right now." onClose={()=>setReplace(null)}><form action={async formData=>{setReplacementError("");try{await updateStudyPlanItem(formData);setReplace(null);router.refresh()}catch(error){setReplacementError(error instanceof Error?error.message:"That activity could not be selected.")}}} className="space-y-4"><input type="hidden" name="itemId" value={replace.id}/><input type="hidden" name="command" value="replace"/><fieldset><legend className="text-sm font-medium">Available activities</legend><RadioGroup name="candidateId" defaultValue={replacementOptions[0]?.id} className="mt-2 max-h-[22rem] space-y-2 overflow-y-auto pr-1">{replacementOptions.map((option)=><label key={option.id} className="group flex cursor-pointer gap-3 rounded-lg border bg-background p-3 transition-colors has-[:checked]:border-ring has-[:checked]:bg-accent/40"><RadioGroupItem required value={option.id} id={`replacement-${option.id}`} className="mt-1"/><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{option.title}</span><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">{replacementLabel(option.type)}</span></span><span className="mt-1 block text-xs text-muted-foreground">{option.context} · {option.description}</span></span></label>)}</RadioGroup></fieldset>{replacementError&&<p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{replacementError}</p>}<div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={()=>setReplace(null)}>Cancel</Button><Button variant="accent">Replace activity</Button></div></form></AppModal>}
    </section>
  );
}

function replacementLabel(type:string){return type==="DUE_REVIEW"?"Due":type==="WEAK_WORDS"?"Weak":type==="LESSON"?"Lesson":"Open focus"}
