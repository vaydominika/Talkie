"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Circle, Headphones, RefreshCcw, Repeat2, Sparkles, Trash2 } from "lucide-react";
import { generateStudyPlan, updateStudyPlanItem } from "@/app/app/dashboard/actions";
import { useTimer } from "@/components/timer-provider";
import { AppModal } from "@/components/app-modal";
import { Button } from "@/components/ui/button";

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
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-background to-indigo-50 shadow-sm dark:border-rose-950 dark:from-rose-950/30 dark:to-indigo-950/30">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rose-100 px-5 py-4 dark:border-rose-950">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">Today</p><h2 className="mt-1 text-xl font-semibold">Your study ribbon</h2><p className="mt-1 text-sm text-muted-foreground">A flexible route through the work that matters today.</p></div>
        <form action={generateStudyPlan} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium">Minutes<select name="durationMinutes" defaultValue={plan?.durationMinutes ?? defaultMinutes} className="mt-1 block h-9 rounded-md border bg-background px-2"><option>15</option><option>30</option><option>45</option><option>60</option><option value={defaultMinutes}>{defaultMinutes} remaining</option></select></label>
          <label className="text-xs font-medium">Language<select name="languageId" defaultValue={plan?.languageId ?? defaultLanguageId ?? ""} className="mt-1 block h-9 rounded-md border bg-background px-2"><option value="">All languages</option>{languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}</select></label>
          <button className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700"><RefreshCcw className="mr-2 h-3.5 w-3.5" />{plan ? "Regenerate" : "Build plan"}</button>
        </form>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-2">
          {visibleItems.map((item, index) => <div key={item.id} className={`flex items-center gap-3 rounded-xl border bg-background/80 p-3 ${item.status === "COMPLETED" ? "opacity-60" : ""}`}>
            <form action={updateStudyPlanItem}><input type="hidden" name="itemId" value={item.id} /><button name="command" value="complete" aria-label={item.status === "COMPLETED" ? "Mark pending" : "Mark complete"} className="text-emerald-600">{item.status === "COMPLETED" ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button></form>
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1"><p className={`font-medium ${item.status === "COMPLETED" ? "line-through" : ""}`}>{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.description}</p></div>
            <span className="text-xs text-muted-foreground">{item.estimatedMinutes} min</span>
            <form action={updateStudyPlanItem} className="flex"><input type="hidden" name="itemId" value={item.id} /><button name="command" value="up" aria-label="Move up" className="p-1 text-muted-foreground"><ArrowUp className="h-3.5 w-3.5" /></button><button name="command" value="down" aria-label="Move down" className="p-1 text-muted-foreground"><ArrowDown className="h-3.5 w-3.5" /></button></form>
            <button type="button" onClick={()=>{setLaunchError("");if(snapshot?.group){setLaunchError("Leave the active group timer before starting a personal plan item.");return;}setLaunch(item);}} className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">Start</button>
            <button type="button" onClick={()=>{setReplacementError("");setReplace(item)}} aria-label="Replace plan item" className="p-1 text-muted-foreground hover:text-indigo-600"><Repeat2 className="h-4 w-4"/></button>
            <form action={updateStudyPlanItem}><input type="hidden" name="itemId" value={item.id} /><button name="command" value="remove" aria-label="Remove item" className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></form>
          </div>)}
          {!plan && <div className="rounded-xl border border-dashed p-8 text-center"><Sparkles className="mx-auto h-5 w-5 text-rose-500" /><p className="mt-2 text-sm font-medium">Build a plan that fits today.</p></div>}
          {plan && !visibleItems.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Everything was removed. Regenerate when you want a fresh route.</p>}
          {plan && <p className="pt-1 text-xs text-muted-foreground">{completed} of {visibleItems.length} activities complete</p>}{launchError&&<p role="alert" className="text-xs text-rose-700">{launchError}</p>}
        </div>
        <aside className="rounded-xl border bg-background/75 p-4"><div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-semibold">Daily quests</h3></div><p className="mt-1 text-xs text-muted-foreground">Complete any two.</p><div className="mt-4 space-y-3">{liveQuests.map((quest) => <div key={quest.id}><div className="flex justify-between gap-2 text-xs"><span>{quest.title}</span><span className="text-muted-foreground">{quest.progress}/{quest.target}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${quest.completedAt ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, quest.progress / quest.target * 100)}%` }} /></div></div>)}</div></aside>
      </div>
      {launch&&<AppModal title="Start this focus item?" description={`${launch.estimatedMinutes} minutes · ${launch.title}`} onClose={()=>setLaunch(null)}><div className="rounded-xl border bg-muted/40 p-4"><p className="font-medium">{launch.title}</p><p className="mt-1 text-sm text-muted-foreground">{launch.description}</p></div>{launchError&&<p role="alert" className="mt-3 text-sm text-rose-700">{launchError}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" onClick={()=>setLaunch(null)}>Cancel</Button><Button disabled={busy} className="bg-rose-600 text-white hover:bg-rose-700" onClick={async()=>{setLaunchError("");const metadata=(launch.metadata&&typeof launch.metadata==="object"?launch.metadata:{}) as Record<string,string>;const destination=launch.href||"/app/dashboard";const prepared=await mutate({action:"prepare",planItemId:launch.id,plannedMinutes:launch.estimatedMinutes,languageId:metadata.languageId,lessonId:launch.type==="LESSON"?launch.referenceId:undefined,destination});if(!prepared){setLaunchError("The timer could not be prepared.");return;}const started=await mutate({action:"personal",groupId:"start"});if(!started){setLaunchError("The timer could not start.");return;}setLaunch(null);setOpen(true);router.push(destination);router.refresh();}}>Start focus</Button></div></AppModal>}
      {replace&&<AppModal title="Replace plan item" description="Choose work that is available right now." onClose={()=>setReplace(null)}><form action={async formData=>{setReplacementError("");try{await updateStudyPlanItem(formData);setReplace(null);router.refresh()}catch(error){setReplacementError(error instanceof Error?error.message:"That activity could not be selected.")}}} className="space-y-4"><input type="hidden" name="itemId" value={replace.id}/><input type="hidden" name="command" value="replace"/><fieldset><legend className="text-sm font-medium">Available activities</legend><div className="mt-2 max-h-[22rem] space-y-2 overflow-y-auto pr-1">{replacementOptions.map((option,index)=><label key={option.id} className="group flex cursor-pointer gap-3 rounded-xl border bg-background p-3 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/60 dark:has-[:checked]:bg-indigo-950/30"><input required type="radio" name="candidateId" value={option.id} defaultChecked={index===0} className="mt-1 accent-indigo-600"/><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{option.title}</span><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">{replacementLabel(option.type)}</span></span><span className="mt-1 block text-xs text-muted-foreground">{option.context} · {option.description}</span></span></label>)}</div></fieldset>{replacementError&&<p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30">{replacementError}</p>}<div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={()=>setReplace(null)}>Cancel</Button><Button className="bg-indigo-600 text-white hover:bg-indigo-700">Replace activity</Button></div></form></AppModal>}
    </section>
  );
}

function replacementLabel(type:string){return type==="DUE_REVIEW"?"Due":type==="WEAK_WORDS"?"Weak":type==="LESSON"?"Lesson":type==="LISTENING"?"Listening":"Open focus"}
