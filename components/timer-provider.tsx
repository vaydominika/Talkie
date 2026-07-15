"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Clock3, FastForward, Pause, Play, RefreshCcw, Settings2, TimerReset, Users, X } from "lucide-react";
import Link from "next/link";

type Timer = {
  id: string;
  phase: "FOCUS" | "BREAK";
  isRunning: boolean;
  endsAt: string | null;
  remainingSeconds: number;
  focusMinutes: number;
  breakMinutes: number;
  autoStart: boolean;
  version: number;
};
type GroupTimer = Timer & { groupId: string; group: { id: string; name: string }; participants: { userId: string; name: string; image: string | null }[] };
type Proposal = { id: string; kind: string; proposerId: string; proposerName: string; expiresAt: string; requiredCount: number; approvals: number; declined: boolean; myVote: boolean | null };
type TimerSnapshot = {
  serverNow: string;
  personal: Timer;
  group: GroupTimer | null;
  proposal: Proposal | null;
  notice: { status: "APPROVED" | "DECLINED" | "EXPIRED"; kind: string } | null;
  recap: { id: string; focusedSeconds: number; contextTitle:string; reviewedWords: number; newWords: number; accuracy: number; weakCleared: number; lessons: number; recapNote: string | null; effort: number | null } | null;
  unreadNotifications: number;
  quests: {id:string;title:string;target:number;progress:number;completedAt:string|null}[];
  daily: {
    today: { id: string; dateKey: string; focusedSeconds: number; focusSessions: number; targetMinutes: number; carryOverMinutes: number; completionShown: boolean };
    effectiveTarget: number;
    completed: boolean;
    carryPrompt: { dateKey: string; seconds: number } | null;
  };
};

type TimerContextValue = {
  snapshot: TimerSnapshot | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
  busy: boolean;
  mutate: (body:Record<string,unknown>)=>Promise<TimerSnapshot|null>;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used inside TimerProvider");
  return context;
}

export function TimerProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const previousPhase = useRef<string | null>(null);

  const request = useCallback(async (body: Record<string, unknown> = {}) => {
    const sentAt = Date.now();
    const response = await fetch("/api/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snapshot", timezone: timezone(), ...body }),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Timer request failed.");
    const receivedAt = Date.now();
    setServerClockOffset(new Date(value.serverNow).getTime() - Math.round((sentAt + receivedAt) / 2));
    setTick(receivedAt);
    setSnapshot(value);
    return value as TimerSnapshot;
  }, []);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      return await request(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Timer request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    request().catch((cause) => setError(cause instanceof Error ? cause.message : "Timer could not load."));
  }, [request, userId]);

  useEffect(() => {
    let midnightTimer = 0;
    const refresh = () => request().catch(() => undefined);
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setHours(24, 0, 1, 0);
      midnightTimer = window.setTimeout(() => {
        void refresh().finally(scheduleMidnightRefresh);
      }, nextDay.getTime() - now.getTime());
    };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    scheduleMidnightRefresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [request, userId]);

  const hasGroupTimer = Boolean(snapshot?.group);
  const needsFastPolling = Boolean(snapshot?.personal.isRunning || hasGroupTimer || snapshot?.proposal);

  useEffect(() => {
    const interval = window.setInterval(() => {
      request(hasGroupTimer ? { action: "heartbeat" } : {}).catch(() => undefined);
    }, needsFastPolling ? 2_000 : 15_000);
    return () => window.clearInterval(interval);
  }, [hasGroupTimer, needsFastPolling, request]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const activeTimer = snapshot?.group ?? snapshot?.personal;
  const remaining = useMemo(() => {
    if (!snapshot || !activeTimer) return 0;
    if (!activeTimer.isRunning) return activeTimer.remainingSeconds;
    if (!activeTimer.endsAt) return activeTimer.remainingSeconds;
    return Math.max(0, Math.ceil((new Date(activeTimer.endsAt).getTime() - (tick + serverClockOffset)) / 1_000));
  }, [activeTimer, serverClockOffset, snapshot, tick]);

  useEffect(() => {
    if (!activeTimer?.isRunning) {
      document.title = "Talkie";
      return;
    }
    const minutes = Math.max(1, Math.ceil(remaining / 60));
    document.title = `${minutes}m ${snapshot?.group ? "Group " : ""}${activeTimer.phase === "FOCUS" ? "Focus" : "Break"} · Talkie`;
    return () => { document.title = "Talkie"; };
  }, [activeTimer?.isRunning, activeTimer?.phase, remaining, snapshot?.group]);

  useEffect(() => {
    if (!activeTimer) return;
    const key = `${snapshot?.group ? "group" : "personal"}-${activeTimer.phase}`;
    if (previousPhase.current && previousPhase.current !== key) {
      try {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 660;
        gain.gain.value = 0.035;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.16);
      } catch { /* sound is an optional in-page cue */ }
    }
    previousPhase.current = key;
  }, [activeTimer, snapshot?.group]);

  const joinGroup = useCallback(async (groupId: string) => {
    const result = await mutate({ action: "join", groupId });
    if (result) setOpen(true);
  }, [mutate]);
  const leaveGroup = useCallback(async () => { await mutate({ action: "leave" }); }, [mutate]);

  const context = useMemo(() => ({ snapshot, open, setOpen, joinGroup, leaveGroup, busy,mutate }), [snapshot, open, joinGroup, leaveGroup, busy,mutate]);

  return (
    <TimerContext.Provider value={context}>
      {children}
      {open && snapshot && <FloatingTimer snapshot={snapshot} remaining={remaining} mutate={mutate} busy={busy} error={error} onClose={() => setOpen(false)} />}
      {snapshot?.proposal ? <ProposalDialog proposal={snapshot.proposal} userId={userId} mutate={mutate} busy={busy} /> : snapshot?.recap ? <FocusRecapDialog recap={snapshot.recap} mutate={mutate} busy={busy} /> : snapshot?.daily.carryPrompt ? <CarryDialog snapshot={snapshot} mutate={mutate} busy={busy} /> : snapshot?.daily.completed && !snapshot.daily.today.completionShown ? <CompletionDialog snapshot={snapshot} mutate={mutate} /> : null}
      <div className="sr-only" aria-live="polite">{error}</div>
    </TimerContext.Provider>
  );
}

export function TimerTrigger() {
  const { snapshot, open, setOpen } = useTimer();
  const timer = snapshot?.group ?? snapshot?.personal;
  return (
    <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant={snapshot?.group ? "accent" : "outline"} onClick={() => setOpen(!open)} aria-label={open ? "Close study timer" : "Open study timer"} className="relative rounded-full">
      {snapshot?.group ? <Users className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
      {timer?.isRunning && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-ring ring-2 ring-background" />}
    </Button></TooltipTrigger><TooltipContent>{open ? "Close timer" : "Open timer"}</TooltipContent></Tooltip>
  );
}

export function NotificationIndicator() {
  const { snapshot } = useTimer(); const count=snapshot?.unreadNotifications??0;
  return <Button asChild variant="outline" size="sm"><Link href="/app/friends" aria-label={`${count} unread friend notifications`}>Friends{count>0&&<Badge className="ml-1.5 min-w-4 px-1 text-[10px]">{Math.min(count,99)}</Badge>}</Link></Button>;
}

function FloatingTimer({ snapshot, remaining, mutate, busy, error, onClose }: { snapshot: TimerSnapshot; remaining: number; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean; error: string; onClose: () => void }) {
  const group = snapshot.group;
  const timer = group ?? snapshot.personal;
  const [settings, setSettings] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(timer.focusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(timer.breakMinutes);
  const [autoStart, setAutoStart] = useState(timer.autoStart);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [desktop, setDesktop] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    setDesktop(window.innerWidth >= 768);
    const stored = localStorage.getItem("talkie-timer-position");
    if (stored) try { setPosition(JSON.parse(stored)); } catch { /* ignore invalid local preference */ }
  }, []);

  const command = (name: string) => group ? mutate({ action: "propose", groupId: name.toUpperCase() }) : mutate({ action: "personal", groupId: name });
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");

  return (
    <Card
      aria-label="Study timer"
      className={`fixed bottom-4 left-1/2 z-[120] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 gap-0 overflow-hidden bg-background/95 p-0 backdrop-blur md:bottom-6 md:left-auto md:right-6 md:translate-x-0 ${group ? "border-foreground" : "border-ring/40"}`}
      style={{ transform: desktop && (position.x || position.y) ? `translate(${position.x}px, ${position.y}px)` : undefined }}
    >
      <div
        className={`flex cursor-move touch-none items-center justify-between border-b px-4 py-3 ${group ? "bg-foreground text-background" : "bg-accent text-accent-foreground"}`}
        onPointerDown={(event) => {
          if (window.innerWidth < 768 || (event.target instanceof Element && event.target.closest("button, input, label, select, textarea, a"))) return;
          drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => { if (!drag.current) return; const next = { x: Math.max(-window.innerWidth + 380, Math.min(0, drag.current.left + event.clientX - drag.current.x)), y: Math.max(-window.innerHeight + 180, Math.min(0, drag.current.top + event.clientY - drag.current.y)) }; setPosition(next); }}
        onPointerUp={(event) => { drag.current = null; localStorage.setItem("talkie-timer-position", JSON.stringify(position)); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {group ? <Users className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{group ? group.group.name : "My focus"}</p><div className="mt-0.5 flex items-center gap-1.5"><p className={`text-[11px] uppercase tracking-[0.16em] ${group ? "text-background/70" : "text-accent-foreground/70"}`}>{timer.phase === "FOCUS" ? "Focus" : "Break"}</p>{group&&<Badge variant="outline" className="h-4 border-background/40 px-1 text-[9px] text-background">Group</Badge>}</div></div>
        </div>
        <div className="flex gap-1">
          <Button type="button" size="icon-sm" variant="ghost" onPointerDown={(event) => event.stopPropagation()} onClick={() => setSettings((visible) => !visible)} className={group?"text-background hover:bg-background/10 hover:text-background":""} aria-label="Timer settings" aria-expanded={settings}><Settings2 className={`h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${settings ? "rotate-90" : ""}`} /></Button>
          <Button type="button" size="icon-sm" variant="ghost" onPointerDown={(event) => event.stopPropagation()} onClick={onClose} className={group?"text-background hover:bg-background/10 hover:text-background":""} aria-label="Close timer"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-[-0.08em]">{minutes}:{seconds}</p>
            <p className="mt-2 text-xs text-muted-foreground">{Math.floor(snapshot.daily.today.focusedSeconds / 60)} of {snapshot.daily.effectiveTarget} minutes today · {snapshot.daily.today.focusSessions} {snapshot.daily.today.focusSessions === 1 ? "session" : "sessions"}</p>
          </div>
          <div className={`grid h-20 w-20 place-items-center rounded-full border-[7px] ${group ? "border-foreground bg-muted" : "border-accent bg-accent/30"}`}>
            <Button disabled={busy} type="button" onClick={() => command(timer.isRunning ? "pause" : "start")} size="icon" variant="outline" className="h-12 w-12 rounded-full" aria-label={timer.isRunning ? "Pause timer" : "Start timer"}>
              {timer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button disabled={busy} variant="outline" onClick={() => command("reset")}><TimerReset className="mr-2 h-4 w-4" />Reset</Button>
          <Button disabled={busy} variant="outline" onClick={() => command("skip")}><FastForward className="mr-2 h-4 w-4" />Skip</Button>
        </div>
        {group && <div className="mt-4 flex items-center justify-between border-t pt-3"><div className="flex -space-x-2">{group.participants.slice(0, 5).map((participant) => <Avatar key={participant.userId} className="h-7 w-7 border-2 border-background"><AvatarImage src={participant.image??undefined} alt=""/><AvatarFallback className="bg-accent text-[10px] text-accent-foreground">{participant.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>)}</div><Button type="button" variant="ghost" size="sm" onClick={() => mutate({ action: "leave" })} className="text-muted-foreground hover:text-destructive">Leave timer</Button></div>}
        <div
          data-slot="timer-settings-panel"
          aria-hidden={!settings}
          inert={settings ? undefined : true}
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${settings ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t pt-4"><TimerSettingsForm group={Boolean(group)} focusMinutes={focusMinutes} breakMinutes={breakMinutes} autoStart={autoStart} busy={busy} setFocusMinutes={setFocusMinutes} setBreakMinutes={setBreakMinutes} setAutoStart={setAutoStart} onSave={()=>{group ? mutate({ action: "propose", groupId: "SETTINGS", focusMinutes, breakMinutes, autoStart }) : mutate({ action: "personal", groupId: "settings", focusMinutes, breakMinutes, autoStart });setSettings(false)}} /></div>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {snapshot.notice && <p className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${snapshot.notice.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-amber-50 text-amber-800 dark:bg-amber-950"}`}>{snapshot.notice.status === "APPROVED" ? `${proposalLabel(snapshot.notice.kind)} approved.` : `${proposalLabel(snapshot.notice.kind)} ${snapshot.notice.status === "EXPIRED" ? "timed out" : "was declined"}.`}</p>}
      </div>
    </Card>
  );
}

function TimerSettingsForm({group,focusMinutes,breakMinutes,autoStart,busy,setFocusMinutes,setBreakMinutes,setAutoStart,onSave}:{group:boolean;focusMinutes:number;breakMinutes:number;autoStart:boolean;busy:boolean;setFocusMinutes:(value:number)=>void;setBreakMinutes:(value:number)=>void;setAutoStart:(value:boolean)=>void;onSave:()=>void}) {
  return <form onSubmit={(event)=>{event.preventDefault();onSave()}} className="space-y-4">
    <div><p className="font-medium">Timer settings</p><p className="mt-1 text-xs text-muted-foreground">{group?"Changes require group approval.":"Used for your next focus and break."}</p></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label htmlFor="timer-focus">Focus minutes</Label><Input id="timer-focus" type="number" min="1" max="240" value={focusMinutes} onChange={(event)=>setFocusMinutes(Number(event.target.value))}/></div>
      <div className="space-y-1.5"><Label htmlFor="timer-break">Break minutes</Label><Input id="timer-break" type="number" min="1" max="60" value={breakMinutes} onChange={(event)=>setBreakMinutes(Number(event.target.value))}/></div>
    </div>
    <div className="flex items-center justify-between gap-3"><Label htmlFor="timer-autostart" className="leading-5">Auto-start next interval</Label><Switch id="timer-autostart" checked={autoStart} onCheckedChange={setAutoStart}/></div>
    <Button variant="accent" className="w-full" disabled={busy}>Save {group?"for approval":"settings"}</Button>
  </form>
}

function proposalLabel(kind: string) {
  return kind === "START" ? "Start" : kind === "PAUSE" ? "Pause" : kind === "RESET" ? "Reset" : kind === "SKIP" ? "Skip" : "Settings change";
}

function ProposalDialog({ proposal, userId, mutate, busy }: { proposal: Proposal; userId: string; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean }) {
  const own = proposal.proposerId === userId;
  const label = proposal.kind === "START" ? "start the timer" : proposal.kind === "PAUSE" ? "pause the timer" : proposal.kind === "RESET" ? "reset this interval" : proposal.kind === "SKIP" ? "skip to the next interval" : "change the timer settings";
  return <AppModal title="Group timer request" description={`${proposal.proposerName} wants to ${label}.`} onClose={() => undefined}>
    <div className="rounded-lg border bg-accent/30 p-4"><p className="text-sm font-medium">{proposal.approvals} of {proposal.requiredCount} ready</p><Progress className="mt-2" value={Math.min(100, proposal.requiredCount ? proposal.approvals / proposal.requiredCount * 100 : 100)} /></div>
    {own || proposal.myVote !== null ? <p className="mt-4 text-center text-sm text-muted-foreground">{proposal.myVote === false ? "You declined this request." : "Waiting for everyone else…"}</p> : <div className="mt-5 grid grid-cols-2 gap-3"><Button disabled={busy} variant="outline" onClick={() => mutate({ action: "vote", proposalId: proposal.id, approved: false })}>Decline</Button><Button disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => mutate({ action: "vote", proposalId: proposal.id, approved: true })}><Check className="mr-2 h-4 w-4" />Approve</Button></div>}
  </AppModal>;
}

function CarryDialog({ snapshot, mutate, busy }: { snapshot: TimerSnapshot; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean }) {
  const minutes = Math.ceil((snapshot.daily.carryPrompt?.seconds ?? 0) / 60);
  return <AppModal title="Carry yesterday forward?" description={`You were ${minutes} minutes short yesterday. Add them to today's goal once?`} onClose={() => undefined}>
    <div className="grid grid-cols-2 gap-3"><Button disabled={busy} variant="outline" onClick={() => mutate({ action: "carry", approved: false })}>No, keep today</Button><Button disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => mutate({ action: "carry", approved: true })}>Add {minutes} min</Button></div>
  </AppModal>;
}

function CompletionDialog({ snapshot, mutate }: { snapshot: TimerSnapshot; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null> }) {
  return <AppModal title="Daily goal complete" description={`You reached ${snapshot.daily.effectiveTarget} focused minutes today.`} onClose={() => mutate({ action: "completion_seen" }).then(() => undefined)}>
    <div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></div><Button className="mt-5" onClick={() => mutate({ action: "completion_seen" })}>Done</Button></div>
  </AppModal>;
}

function FocusRecapDialog({ recap, mutate, busy }: { recap: NonNullable<TimerSnapshot["recap"]>; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean }) {
  const [note, setNote] = useState(recap.recapNote??"");
  const [effort, setEffort] = useState(recap.effort??3);
  return <AppModal title="Focus session complete" description={`${recap.contextTitle} · ${Math.floor(recap.focusedSeconds / 60)} focused minutes recorded.`} onClose={() => mutate({ action: "dismiss_recap", sessionId: recap.id }).then(() => undefined)}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[["Reviewed", recap.reviewedWords], ["New", recap.newWords], ["Accuracy", `${recap.accuracy}%`], ["Weak cleared", recap.weakCleared], ["Lessons", recap.lessons]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div>
    <div className="mt-4 space-y-1.5"><Label htmlFor="recap-note">Private note</Label><Textarea id="recap-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className="min-h-20" placeholder="What did you work on?" /></div>
    <div className="mt-3 space-y-2"><Label htmlFor="recap-effort">Effort: {effort}/5</Label><Slider id="recap-effort" min={1} max={5} step={1} value={[effort]} onValueChange={(value) => setEffort(value[0]??3)} /></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><Button disabled={busy} variant="outline" onClick={() => mutate({ action: "dismiss_recap", sessionId: recap.id })}>Not now</Button><Button disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => mutate({ action: "save_recap", sessionId: recap.id, note, effort })}>Save reflection</Button></div>
  </AppModal>;
}
