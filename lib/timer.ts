import { prisma } from "@/lib/prisma";
import type { GroupTimerRoom, PersonalTimerState, TimerPhase, TimerProposalKind } from "@prisma/client";

export const ACTIVE_WINDOW_MS = 120_000;
export const PROPOSAL_WINDOW_MS = 60_000;

export function safeTimezone(value: unknown) {
  const timezone = typeof value === "string" ? value : "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

export function dateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function secondsForPhase(phase: TimerPhase, focusMinutes: number, breakMinutes: number) {
  return (phase === "FOCUS" ? focusMinutes : breakMinutes) * 60;
}

export function oppositePhase(phase: TimerPhase): TimerPhase {
  return phase === "FOCUS" ? "BREAK" : "FOCUS";
}

export function displayedRemaining(timer: Pick<PersonalTimerState | GroupTimerRoom, "isRunning" | "remainingSeconds" | "endsAt">, now = new Date()) {
  if (!timer.isRunning || !timer.endsAt) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((timer.endsAt.getTime() - now.getTime()) / 1000));
}

export function wholeSecondEnd(start: Date, end: Date) {
  const wholeSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1_000));
  return new Date(start.getTime() + wholeSeconds * 1_000);
}

async function profileFor(userId: string, timezone: string) {
  return prisma.userProfile.upsert({
    where: { userId },
    update: { timezone },
    create: { userId, dailyMinutes: 15, timezone },
  });
}

export async function ensureDailyRecord(userId: string, key: string, timezone: string) {
  const profile = await profileFor(userId, timezone);
  return prisma.dailyStudyRecord.upsert({
    where: { userId_dateKey: { userId, dateKey: key } },
    update: {},
    create: { userId, dateKey: key, timezone, targetMinutes: profile.dailyMinutes },
  });
}

async function addSeconds(userId: string, key: string, timezone: string, seconds: number) {
  if (seconds <= 0) return;
  await ensureDailyRecord(userId, key, timezone);
  await prisma.dailyStudyRecord.update({
    where: { userId_dateKey: { userId, dateKey: key } },
    data: { focusedSeconds: { increment: seconds } },
  });
}

export async function incrementFocusSession(userId: string, at: Date, timezone: string) {
  const key = dateKey(at, timezone);
  await ensureDailyRecord(userId, key, timezone);
  await prisma.dailyStudyRecord.update({
    where: { userId_dateKey: { userId, dateKey: key } },
    data: { focusSessions: { increment: 1 } },
  });
}

export async function creditRange(userId: string, start: Date, end: Date, timezone: string) {
  if (end <= start) return;
  let cursor = start.getTime();
  const finish = end.getTime();
  while (cursor < finish) {
    const key = dateKey(new Date(cursor), timezone);
    let high = Math.min(finish, cursor + 3_600_000);
    while (high < finish && dateKey(new Date(high), timezone) === key) high = Math.min(finish, high + 3_600_000);
    if (dateKey(new Date(high), timezone) !== key) {
      let low = cursor;
      while (high - low > 1_000) {
        const middle = Math.floor((low + high) / 2);
        if (dateKey(new Date(middle), timezone) === key) low = middle;
        else high = middle;
      }
    }
    const boundary = Math.min(finish, high);
    await addSeconds(userId, key, timezone, Math.max(0, Math.floor((boundary - cursor) / 1_000)));
    cursor = boundary;
    if (finish - cursor < 1_000) break;
  }
}

export async function getPersonalTimer(userId: string) {
  return prisma.personalTimerState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function reconcilePersonal(userId: string, timezone: string, now = new Date()) {
  let timer = await getPersonalTimer(userId);
  if (timer.isRunning && timer.endsAt) {
    const intervalEnd = timer.endsAt < now ? timer.endsAt : now;
    if (timer.phase === "FOCUS" && timer.phaseStartedAt) {
      const start = timer.creditedUntil && timer.creditedUntil > timer.phaseStartedAt ? timer.creditedUntil : timer.phaseStartedAt;
      const creditEnd = wholeSecondEnd(start, intervalEnd);
      if (creditEnd > start) {
        const claim = await prisma.personalTimerState.updateMany({ where: { id: timer.id, creditedUntil: timer.creditedUntil }, data: { creditedUntil: creditEnd } });
        if (claim.count) await creditRange(userId, start, creditEnd, timezone);
      }
    }
    if (now < timer.endsAt) {
      timer = await prisma.personalTimerState.findUniqueOrThrow({ where: { id: timer.id } });
      return timer;
    }
    const nextPhase = oppositePhase(timer.phase);
    const nextSeconds = secondsForPhase(nextPhase, timer.focusMinutes, timer.breakMinutes);
    const nextStart = now;
    const nextFocusSessionId = nextPhase === "FOCUS" && timer.autoStart ? crypto.randomUUID() : null;
    if (nextFocusSessionId) await incrementFocusSession(userId, nextStart, timezone);
    timer = await prisma.personalTimerState.update({
      where: { id: timer.id },
      data: timer.autoStart
        ? { phase: nextPhase, phaseStartedAt: nextStart, endsAt: new Date(nextStart.getTime() + nextSeconds * 1000), remainingSeconds: nextSeconds, creditedUntil: nextStart, focusSessionId: nextFocusSessionId, version: { increment: 1 } }
        : { phase: nextPhase, isRunning: false, phaseStartedAt: null, endsAt: null, remainingSeconds: nextSeconds, creditedUntil: null, focusSessionId: null, version: { increment: 1 } },
    });
  }
  return timer;
}

export async function reconcileRoom(roomId: string, now = new Date()) {
  let room = await prisma.groupTimerRoom.findUnique({ where: { id: roomId }, include: { participants: { include: { user: { include: { profile: true } } } } } });
  if (!room) return null;
  if (room.isRunning && room.endsAt) {
    const intervalEnd = room.endsAt < now ? room.endsAt : now;
    if (room.phase === "FOCUS" && room.phaseStartedAt) {
      for (const participant of room.participants) {
        const activeEnd = new Date(Math.min(intervalEnd.getTime(), participant.lastSeenAt.getTime() + ACTIVE_WINDOW_MS));
        const start = participant.creditedUntil && participant.creditedUntil > room.phaseStartedAt ? participant.creditedUntil : room.phaseStartedAt;
        const creditEnd = wholeSecondEnd(start, activeEnd);
        if (creditEnd > start) {
          const isNewSession = Boolean(room.focusSessionId && participant.lastCountedFocusSessionId !== room.focusSessionId);
          const claim = await prisma.groupTimerParticipant.updateMany({
            where: { id: participant.id, creditedUntil: participant.creditedUntil },
            data: { creditedUntil: creditEnd, ...(isNewSession ? { lastCountedFocusSessionId: room.focusSessionId } : {}) },
          });
          if (claim.count) {
            const timezone = safeTimezone(participant.user.profile?.timezone);
            await creditRange(participant.userId, start, creditEnd, timezone);
            if (isNewSession) await incrementFocusSession(participant.userId, start, timezone);
          }
        }
      }
    }
    if (now < room.endsAt) return room;
    const nextPhase = oppositePhase(room.phase);
    const nextSeconds = secondsForPhase(nextPhase, room.focusMinutes, room.breakMinutes);
    const nextStart = now;
    const nextFocusSessionId = nextPhase === "FOCUS" && room.autoStart ? crypto.randomUUID() : null;
    await prisma.groupTimerParticipant.updateMany({ where: { roomId }, data: { creditedUntil: nextStart } });
    await prisma.groupTimerRoom.update({
      where: { id: room.id },
      data: room.autoStart
        ? { phase: nextPhase, phaseStartedAt: nextStart, endsAt: new Date(nextStart.getTime() + nextSeconds * 1000), remainingSeconds: nextSeconds, focusSessionId: nextFocusSessionId, version: { increment: 1 } }
        : { phase: nextPhase, isRunning: false, phaseStartedAt: null, endsAt: null, remainingSeconds: nextSeconds, focusSessionId: null, version: { increment: 1 } },
    });
    room = await prisma.groupTimerRoom.findUnique({ where: { id: roomId }, include: { participants: { include: { user: { include: { profile: true } } } } } });
  }
  return room;
}

export async function applyRoomAction(roomId: string, kind: TimerProposalKind, payload: Record<string, unknown> | null, now = new Date()) {
  await reconcileRoom(roomId, now);
  const room = await prisma.groupTimerRoom.findUniqueOrThrow({ where: { id: roomId } });
  if (kind === "START") {
    const seconds = displayedRemaining(room, now) || secondsForPhase(room.phase, room.focusMinutes, room.breakMinutes);
    const focusSessionId = room.phase === "FOCUS" ? room.focusSessionId ?? crypto.randomUUID() : null;
    await prisma.groupTimerParticipant.updateMany({ where: { roomId }, data: { creditedUntil: now } });
    return prisma.groupTimerRoom.update({ where: { id: roomId }, data: { isRunning: true, phaseStartedAt: now, endsAt: new Date(now.getTime() + seconds * 1000), remainingSeconds: seconds, focusSessionId, version: { increment: 1 } } });
  }
  if (kind === "PAUSE") {
    return prisma.groupTimerRoom.update({ where: { id: roomId }, data: { isRunning: false, remainingSeconds: displayedRemaining(room, now), phaseStartedAt: null, endsAt: null, version: { increment: 1 } } });
  }
  if (kind === "RESET") {
    return prisma.groupTimerRoom.update({ where: { id: roomId }, data: { isRunning: false, remainingSeconds: secondsForPhase(room.phase, room.focusMinutes, room.breakMinutes), phaseStartedAt: null, endsAt: null, focusSessionId: null, version: { increment: 1 } } });
  }
  if (kind === "SKIP") {
    const phase = oppositePhase(room.phase);
    const seconds = secondsForPhase(phase, room.focusMinutes, room.breakMinutes);
    const focusSessionId = phase === "FOCUS" && room.autoStart ? crypto.randomUUID() : null;
    await prisma.groupTimerParticipant.updateMany({ where: { roomId }, data: { creditedUntil: now } });
    return prisma.groupTimerRoom.update({ where: { id: roomId }, data: room.autoStart ? { phase, isRunning: true, remainingSeconds: seconds, phaseStartedAt: now, endsAt: new Date(now.getTime() + seconds * 1000), focusSessionId, version: { increment: 1 } } : { phase, isRunning: false, remainingSeconds: seconds, phaseStartedAt: null, endsAt: null, focusSessionId: null, version: { increment: 1 } } });
  }
  const focusMinutes = Math.max(1, Math.min(240, Number(payload?.focusMinutes) || room.focusMinutes));
  const breakMinutes = Math.max(1, Math.min(60, Number(payload?.breakMinutes) || room.breakMinutes));
  const autoStart = Boolean(payload?.autoStart);
  return prisma.groupTimerRoom.update({ where: { id: roomId }, data: { focusMinutes, breakMinutes, autoStart, isRunning: false, phaseStartedAt: null, endsAt: null, remainingSeconds: secondsForPhase(room.phase, focusMinutes, breakMinutes), focusSessionId: null, version: { increment: 1 } } });
}

export async function dailyContext(userId: string, timezone: string, now = new Date()) {
  const todayKey = dateKey(now, timezone);
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const [today, yesterday] = await Promise.all([
    ensureDailyRecord(userId, todayKey, timezone),
    prisma.dailyStudyRecord.findUnique({ where: { userId_dateKey: { userId, dateKey: yesterdayKey } } }),
  ]);
  const effectiveTarget = today.targetMinutes + today.carryOverMinutes;
  const yesterdayTarget = yesterday ? yesterday.targetMinutes + yesterday.carryOverMinutes : 0;
  const shortfall = yesterday ? Math.max(0, yesterdayTarget * 60 - yesterday.focusedSeconds) : 0;
  return {
    today,
    effectiveTarget,
    completed: today.focusedSeconds >= effectiveTarget * 60,
    carryPrompt: yesterday && shortfall > 0 && !yesterday.carryPromptResponse ? { dateKey: yesterdayKey, seconds: shortfall } : null,
  };
}
