"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppModal } from "@/components/app-modal";
import { Button } from "@/components/ui/button";
import { Check, Clock3, FastForward, Pause, Play, RefreshCcw, Settings2, TimerReset, Users, X } from "lucide-react";

type Timer = {
  id: string;
  phase: "FOCUS" | "BREAK";
  isRunning: boolean;
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
  daily: {
    today: { id: string; focusedSeconds: number; targetMinutes: number; carryOverMinutes: number; completionShown: boolean };
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
  const previousPhase = useRef<string | null>(null);

  const request = useCallback(async (body: Record<string, unknown> = {}) => {
    const response = await fetch("/api/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snapshot", timezone: timezone(), ...body }),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Timer request failed.");
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
    const active = Boolean(snapshot?.personal.isRunning || snapshot?.group || snapshot?.proposal);
    const interval = window.setInterval(() => {
      request(snapshot?.group ? { action: "heartbeat" } : {}).catch(() => undefined);
    }, active ? 2_000 : 15_000);
    return () => window.clearInterval(interval);
  }, [request, snapshot?.group, snapshot?.personal.isRunning, snapshot?.proposal]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const activeTimer = snapshot?.group ?? snapshot?.personal;
  const remaining = useMemo(() => {
    if (!snapshot || !activeTimer) return 0;
    if (!activeTimer.isRunning) return activeTimer.remainingSeconds;
    const elapsed = Math.max(0, Math.floor((tick - new Date(snapshot.serverNow).getTime()) / 1_000));
    return Math.max(0, activeTimer.remainingSeconds - elapsed);
  }, [activeTimer, snapshot, tick]);

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

  const context = useMemo(() => ({ snapshot, open, setOpen, joinGroup, leaveGroup, busy }), [snapshot, open, joinGroup, leaveGroup, busy]);

  return (
    <TimerContext.Provider value={context}>
      {children}
      {open && snapshot && <FloatingTimer snapshot={snapshot} remaining={remaining} mutate={mutate} busy={busy} error={error} onClose={() => setOpen(false)} />}
      {snapshot?.proposal ? <ProposalDialog proposal={snapshot.proposal} userId={userId} mutate={mutate} busy={busy} /> : snapshot?.daily.carryPrompt ? <CarryDialog snapshot={snapshot} mutate={mutate} busy={busy} /> : snapshot?.daily.completed && !snapshot.daily.today.completionShown ? <CompletionDialog snapshot={snapshot} mutate={mutate} /> : null}
      <div className="sr-only" aria-live="polite">{error}</div>
    </TimerContext.Provider>
  );
}

export function TimerTrigger() {
  const { snapshot, open, setOpen } = useTimer();
  const timer = snapshot?.group ?? snapshot?.personal;
  return (
    <button type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close study timer" : "Open study timer"} className={`relative grid h-9 w-9 place-items-center rounded-full border transition-colors ${snapshot?.group ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950" : "hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"}`}>
      {snapshot?.group ? <Users className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
      {timer?.isRunning && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 ring-2 ring-background" />}
    </button>
  );
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
    <section
      aria-label="Study timer"
      className={`fixed bottom-4 left-1/2 z-[120] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border bg-background/95 shadow-2xl backdrop-blur md:bottom-6 md:left-auto md:right-6 md:translate-x-0 ${group ? "border-indigo-200 dark:border-indigo-900" : "border-rose-200 dark:border-rose-900"}`}
      style={{ transform: desktop && (position.x || position.y) ? `translate(${position.x}px, ${position.y}px)` : undefined }}
    >
      <div
        className={`flex cursor-move touch-none items-center justify-between rounded-t-2xl border-b px-4 py-3 ${group ? "bg-indigo-50/80 dark:bg-indigo-950/60" : "bg-rose-50/80 dark:bg-rose-950/50"}`}
        onPointerDown={(event) => { if (window.innerWidth < 768) return; drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (!drag.current) return; const next = { x: Math.max(-window.innerWidth + 380, Math.min(0, drag.current.left + event.clientX - drag.current.x)), y: Math.max(-window.innerHeight + 180, Math.min(0, drag.current.top + event.clientY - drag.current.y)) }; setPosition(next); }}
        onPointerUp={(event) => { drag.current = null; localStorage.setItem("talkie-timer-position", JSON.stringify(position)); event.currentTarget.releasePointerCapture(event.pointerId); }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {group ? <Users className="h-4 w-4 text-indigo-600" /> : <Clock3 className="h-4 w-4 text-rose-600" />}
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{group ? group.group.name : "My focus"}</p><p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{timer.phase === "FOCUS" ? "Focus" : "Break"}</p></div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setSettings(!settings)} className="rounded-md p-1.5 text-muted-foreground hover:bg-background" aria-label="Timer settings"><Settings2 className="h-4 w-4" /></button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-background" aria-label="Close timer"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-[-0.08em]">{minutes}:{seconds}</p>
            <p className="mt-2 text-xs text-muted-foreground">{Math.floor(snapshot.daily.today.focusedSeconds / 60)} of {snapshot.daily.effectiveTarget} minutes today</p>
          </div>
          <div className={`grid h-20 w-20 place-items-center rounded-full border-[7px] ${group ? "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950" : "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-950 dark:bg-rose-950"}`}>
            <button disabled={busy} type="button" onClick={() => command(timer.isRunning ? "pause" : "start")} className="grid h-12 w-12 place-items-center rounded-full bg-background shadow-sm transition-transform hover:scale-105" aria-label={timer.isRunning ? "Pause timer" : "Start timer"}>
              {timer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button disabled={busy} variant="outline" onClick={() => command("reset")}><TimerReset className="mr-2 h-4 w-4" />Reset</Button>
          <Button disabled={busy} variant="outline" onClick={() => command("skip")}><FastForward className="mr-2 h-4 w-4" />Skip</Button>
        </div>
        {group && <div className="mt-4 flex items-center justify-between border-t pt-3"><div className="flex -space-x-2">{group.participants.slice(0, 5).map((participant) => <span key={participant.userId} title={participant.name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-indigo-100 text-[10px] font-semibold text-indigo-800">{participant.name.slice(0, 1).toUpperCase()}</span>)}</div><button type="button" onClick={() => mutate({ action: "leave" })} className="text-xs font-medium text-muted-foreground hover:text-rose-600">Leave group timer</button></div>}
        {settings && <form className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); group ? mutate({ action: "propose", groupId: "SETTINGS", focusMinutes, breakMinutes, autoStart }) : mutate({ action: "personal", groupId: "settings", focusMinutes, breakMinutes, autoStart }); setSettings(false); }}>
          <label className="text-xs font-medium">Focus minutes<input className="mt-1 h-9 w-full rounded-md border bg-background px-2" type="number" min="1" max="240" value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value))} /></label>
          <label className="text-xs font-medium">Break minutes<input className="mt-1 h-9 w-full rounded-md border bg-background px-2" type="number" min="1" max="60" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} /></label>
          <label className="col-span-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} /> Auto-start the next interval</label>
          <Button className="col-span-2" disabled={busy}>Save {group ? "for group approval" : "settings"}</Button>
        </form>}
        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
        {snapshot.notice && <p className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${snapshot.notice.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-amber-50 text-amber-800 dark:bg-amber-950"}`}>{snapshot.notice.status === "APPROVED" ? `${proposalLabel(snapshot.notice.kind)} approved.` : `${proposalLabel(snapshot.notice.kind)} ${snapshot.notice.status === "EXPIRED" ? "timed out" : "was declined"}.`}</p>}
      </div>
    </section>
  );
}

function proposalLabel(kind: string) {
  return kind === "START" ? "Start" : kind === "PAUSE" ? "Pause" : kind === "RESET" ? "Reset" : kind === "SKIP" ? "Skip" : "Settings change";
}

function ProposalDialog({ proposal, userId, mutate, busy }: { proposal: Proposal; userId: string; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean }) {
  const own = proposal.proposerId === userId;
  const label = proposal.kind === "START" ? "start the timer" : proposal.kind === "PAUSE" ? "pause the timer" : proposal.kind === "RESET" ? "reset this interval" : proposal.kind === "SKIP" ? "skip to the next interval" : "change the timer settings";
  return <AppModal title="Group timer request" description={`${proposal.proposerName} wants to ${label}.`} onClose={() => undefined}>
    <div className="rounded-xl border bg-indigo-50/60 p-4 dark:bg-indigo-950/30"><p className="text-sm font-medium">{proposal.approvals} of {proposal.requiredCount} ready</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, proposal.requiredCount ? proposal.approvals / proposal.requiredCount * 100 : 100)}%` }} /></div></div>
    {own || proposal.myVote !== null ? <p className="mt-4 text-center text-sm text-muted-foreground">{proposal.myVote === false ? "You declined this request." : "Waiting for everyone else…"}</p> : <div className="mt-5 grid grid-cols-2 gap-3"><Button disabled={busy} variant="outline" onClick={() => mutate({ action: "vote", proposalId: proposal.id, approved: false })}>Decline</Button><Button disabled={busy} className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => mutate({ action: "vote", proposalId: proposal.id, approved: true })}><Check className="mr-2 h-4 w-4" />Approve</Button></div>}
  </AppModal>;
}

function CarryDialog({ snapshot, mutate, busy }: { snapshot: TimerSnapshot; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null>; busy: boolean }) {
  const minutes = Math.ceil((snapshot.daily.carryPrompt?.seconds ?? 0) / 60);
  return <AppModal title="Carry yesterday forward?" description={`You were ${minutes} minutes short yesterday. Add them to today's goal once?`} onClose={() => undefined}>
    <div className="grid grid-cols-2 gap-3"><Button disabled={busy} variant="outline" onClick={() => mutate({ action: "carry", approved: false })}>No, keep today</Button><Button disabled={busy} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => mutate({ action: "carry", approved: true })}>Add {minutes} min</Button></div>
  </AppModal>;
}

function CompletionDialog({ snapshot, mutate }: { snapshot: TimerSnapshot; mutate: (body: Record<string, unknown>) => Promise<TimerSnapshot | null> }) {
  return <AppModal title="Daily goal complete" description={`You reached ${snapshot.daily.effectiveTarget} focused minutes today.`} onClose={() => mutate({ action: "completion_seen" }).then(() => undefined)}>
    <div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></div><Button className="mt-5 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => mutate({ action: "completion_seen" })}>Done</Button></div>
  </AppModal>;
}
