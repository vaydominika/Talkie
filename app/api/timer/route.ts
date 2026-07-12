import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_WINDOW_MS,
  PROPOSAL_WINDOW_MS,
  applyRoomAction,
  dailyContext,
  displayedRemaining,
  getPersonalTimer,
  incrementFocusSession,
  oppositePhase,
  reconcilePersonal,
  reconcileRoom,
  safeTimezone,
  secondsForPhase,
} from "@/lib/timer";
import type { Prisma, TimerProposalKind } from "@prisma/client";

type Body = { action?: string; timezone?: string; groupId?: string; proposalId?: string; approved?: boolean; focusMinutes?: number; breakMinutes?: number; autoStart?: boolean };

async function requireMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, include: { group: true } });
  if (!membership) throw new Error("You are not a member of this group.");
  return membership;
}

async function resolveExpired(roomId: string) {
  await prisma.groupTimerProposal.updateMany({ where: { roomId, status: "PENDING", expiresAt: { lte: new Date() } }, data: { status: "EXPIRED", resolvedAt: new Date() } });
}

async function resolveProposal(proposalId: string) {
  const proposal = await prisma.groupTimerProposal.findUnique({ where: { id: proposalId }, include: { votes: true } });
  if (!proposal || proposal.status !== "PENDING") return;
  if (proposal.expiresAt <= new Date()) {
    await prisma.groupTimerProposal.update({ where: { id: proposal.id }, data: { status: "EXPIRED", resolvedAt: new Date() } });
    return;
  }
  if (proposal.votes.some((vote) => !vote.approved)) {
    await prisma.groupTimerProposal.update({ where: { id: proposal.id }, data: { status: "DECLINED", resolvedAt: new Date() } });
    return;
  }
  const required = Array.isArray(proposal.requiredUserIds) ? proposal.requiredUserIds.filter((id): id is string => typeof id === "string") : [];
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const activeRequired = await prisma.groupTimerParticipant.findMany({ where: { roomId: proposal.roomId, userId: { in: required }, lastSeenAt: { gt: cutoff } }, select: { userId: true } });
  const approved = new Set(proposal.votes.filter((vote) => vote.approved).map((vote) => vote.userId));
  if (activeRequired.every((participant) => approved.has(participant.userId))) {
    const room = await prisma.groupTimerRoom.findUnique({ where: { id: proposal.roomId } });
    if (!room || room.version !== proposal.baseVersion) {
      await prisma.groupTimerProposal.update({ where: { id: proposal.id }, data: { status: "EXPIRED", resolvedAt: new Date() } });
      return;
    }
    await applyRoomAction(proposal.roomId, proposal.kind, proposal.payload as Record<string, unknown> | null);
    await prisma.groupTimerProposal.update({ where: { id: proposal.id }, data: { status: "APPROVED", resolvedAt: new Date() } });
  }
}

async function serialize(userId: string, timezone: string) {
  const now = new Date();
  const personal = await reconcilePersonal(userId, timezone, now);
  const participation = await prisma.groupTimerParticipant.findFirst({ where: { userId }, orderBy: { lastSeenAt: "desc" }, include: { room: { include: { group: { select: { id: true, name: true } } } } } });
  let group = null;
  let proposal = null;
  let notice = null;
  if (participation) {
    await reconcileRoom(participation.roomId, now);
    await resolveExpired(participation.roomId);
    const room = await prisma.groupTimerRoom.findUniqueOrThrow({ where: { id: participation.roomId }, include: { group: { select: { id: true, name: true } }, participants: { where: { lastSeenAt: { gt: new Date(now.getTime() - ACTIVE_WINDOW_MS) } }, include: { user: { select: { name: true, email: true, image: true } } } } } });
    const pending = await prisma.groupTimerProposal.findFirst({ where: { roomId: room.id, status: "PENDING" }, orderBy: { createdAt: "desc" }, include: { proposer: { select: { name: true, email: true } }, votes: true } });
    const recent = await prisma.groupTimerProposal.findFirst({ where: { roomId: room.id, status: { not: "PENDING" }, resolvedAt: { gt: new Date(now.getTime() - 10_000) } }, orderBy: { resolvedAt: "desc" }, select: { status: true, kind: true } });
    group = { ...room, remainingSeconds: displayedRemaining(room, now), participants: room.participants.map((p) => ({ userId: p.userId, name: p.user.name || p.user.email, image: p.user.image })) };
    if (pending) {
      const required = Array.isArray(pending.requiredUserIds) ? pending.requiredUserIds : [];
      proposal = { id: pending.id, kind: pending.kind, payload: pending.payload, proposerId: pending.proposerId, proposerName: pending.proposer.name || pending.proposer.email, expiresAt: pending.expiresAt, requiredCount: required.length, approvals: pending.votes.filter((v) => v.approved).length, declined: pending.votes.some((v) => !v.approved), myVote: pending.votes.find((v) => v.userId === userId)?.approved ?? null };
    }
    if (recent) notice = { status: recent.status, kind: recent.kind };
  }
  const daily = await dailyContext(userId, timezone, now);
  return { serverNow: now, personal: { ...personal, remainingSeconds: displayedRemaining(personal, now) }, group, proposal, notice, daily: { ...daily, today: { ...daily.today } } };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  try {
    const body = (await request.json()) as Body;
    const timezone = safeTimezone(body.timezone);
    const action = body.action ?? "snapshot";
    if (action === "personal") {
      const timer = await reconcilePersonal(userId, timezone);
      const now = new Date();
      const joined = await prisma.groupTimerParticipant.findFirst({ where: { userId, lastSeenAt: { gt: new Date(now.getTime() - ACTIVE_WINDOW_MS) } } });
      if (joined && body.groupId !== "pause") throw new Error("Leave the group timer before starting a personal timer.");
      const command = body.groupId;
      if (command === "start") {
        const seconds = displayedRemaining(timer, now) || secondsForPhase(timer.phase, timer.focusMinutes, timer.breakMinutes);
        const focusSessionId = timer.phase === "FOCUS" ? timer.focusSessionId ?? crypto.randomUUID() : null;
        if (focusSessionId && !timer.focusSessionId) await incrementFocusSession(userId, now, timezone);
        await prisma.personalTimerState.update({ where: { userId }, data: { isRunning: true, remainingSeconds: seconds, phaseStartedAt: now, endsAt: new Date(now.getTime() + seconds * 1000), creditedUntil: now, focusSessionId, version: { increment: 1 } } });
      } else if (command === "pause") {
        await prisma.personalTimerState.update({ where: { userId }, data: { isRunning: false, remainingSeconds: displayedRemaining(timer, now), phaseStartedAt: null, endsAt: null, version: { increment: 1 } } });
      } else if (command === "reset") {
        await prisma.personalTimerState.update({ where: { userId }, data: { isRunning: false, remainingSeconds: secondsForPhase(timer.phase, timer.focusMinutes, timer.breakMinutes), phaseStartedAt: null, endsAt: null, creditedUntil: null, focusSessionId: null, version: { increment: 1 } } });
      } else if (command === "skip") {
        const phase = oppositePhase(timer.phase);
        const seconds = secondsForPhase(phase, timer.focusMinutes, timer.breakMinutes);
        const running = timer.autoStart;
        const focusSessionId = phase === "FOCUS" && running ? crypto.randomUUID() : null;
        if (focusSessionId) await incrementFocusSession(userId, now, timezone);
        await prisma.personalTimerState.update({ where: { userId }, data: { phase, isRunning: running, remainingSeconds: seconds, phaseStartedAt: running ? now : null, endsAt: running ? new Date(now.getTime() + seconds * 1000) : null, creditedUntil: running ? now : null, focusSessionId, version: { increment: 1 } } });
      } else if (command === "settings") {
        const focusMinutes = Math.max(1, Math.min(240, Number(body.focusMinutes) || 25));
        const breakMinutes = Math.max(1, Math.min(60, Number(body.breakMinutes) || 5));
        await prisma.personalTimerState.update({ where: { userId }, data: { focusMinutes, breakMinutes, autoStart: Boolean(body.autoStart), isRunning: false, phaseStartedAt: null, endsAt: null, remainingSeconds: secondsForPhase(timer.phase, focusMinutes, breakMinutes), focusSessionId: null, version: { increment: 1 } } });
      }
    } else if (action === "join") {
      const membership = await requireMembership(String(body.groupId), userId);
      await reconcilePersonal(userId, timezone);
      await prisma.personalTimerState.update({ where: { userId }, data: { isRunning: false, phaseStartedAt: null, endsAt: null } });
      await prisma.groupTimerParticipant.deleteMany({ where: { userId } });
      const room = await prisma.groupTimerRoom.upsert({ where: { groupId: membership.groupId }, update: {}, create: { groupId: membership.groupId } });
      await prisma.groupTimerParticipant.create({ data: { roomId: room.id, userId, creditedUntil: new Date() } });
    } else if (action === "leave") {
      const participant = await prisma.groupTimerParticipant.findFirst({ where: { userId } });
      if (participant) {
        await reconcileRoom(participant.roomId);
        await prisma.groupTimerParticipant.delete({ where: { id: participant.id } });
      }
    } else if (action === "heartbeat") {
      const participant = await prisma.groupTimerParticipant.findFirst({ where: { userId } });
      if (participant) {
        await reconcileRoom(participant.roomId);
        await prisma.groupTimerParticipant.update({ where: { id: participant.id }, data: { lastSeenAt: new Date() } });
      }
    } else if (action === "propose") {
      const participant = await prisma.groupTimerParticipant.findFirst({ where: { userId }, include: { room: true } });
      if (!participant) throw new Error("Join a group timer first.");
      await requireMembership(participant.room.groupId, userId);
      await reconcileRoom(participant.roomId);
      const currentRoom = await prisma.groupTimerRoom.findUniqueOrThrow({ where: { id: participant.roomId } });
      await resolveExpired(participant.roomId);
      const existing = await prisma.groupTimerProposal.findFirst({ where: { roomId: participant.roomId, status: "PENDING" } });
      if (existing) throw new Error("Another timer change is already waiting for approval.");
      const active = await prisma.groupTimerParticipant.findMany({ where: { roomId: participant.roomId, lastSeenAt: { gt: new Date(Date.now() - ACTIVE_WINDOW_MS) } }, select: { userId: true } });
      const kind = String(body.groupId) as TimerProposalKind;
      if (!["START", "PAUSE", "RESET", "SKIP", "SETTINGS"].includes(kind)) throw new Error("Unknown timer action.");
      const payload: Prisma.InputJsonValue | undefined = kind === "SETTINGS" ? { focusMinutes: body.focusMinutes ?? 25, breakMinutes: body.breakMinutes ?? 5, autoStart: Boolean(body.autoStart) } : undefined;
      const proposal = await prisma.groupTimerProposal.create({ data: { roomId: participant.roomId, proposerId: userId, kind, payload, requiredUserIds: active.map((p) => p.userId), baseVersion: currentRoom.version, expiresAt: new Date(Date.now() + PROPOSAL_WINDOW_MS), votes: { create: { userId, approved: true } } } });
      await resolveProposal(proposal.id);
    } else if (action === "vote") {
      const proposal = await prisma.groupTimerProposal.findUnique({ where: { id: String(body.proposalId) }, include: { room: true } });
      if (!proposal || proposal.status !== "PENDING") throw new Error("This proposal is no longer active.");
      await requireMembership(proposal.room.groupId, userId);
      const required = Array.isArray(proposal.requiredUserIds) ? proposal.requiredUserIds : [];
      if (!required.includes(userId)) throw new Error("You are not part of this vote.");
      await prisma.groupTimerVote.upsert({ where: { proposalId_userId: { proposalId: proposal.id, userId } }, update: { approved: Boolean(body.approved) }, create: { proposalId: proposal.id, userId, approved: Boolean(body.approved) } });
      await resolveProposal(proposal.id);
    } else if (action === "carry") {
      const context = await dailyContext(userId, timezone);
      if (context.carryPrompt) {
        await prisma.dailyStudyRecord.update({ where: { userId_dateKey: { userId, dateKey: context.carryPrompt.dateKey } }, data: { carryPromptResponse: body.approved ? "ACCEPTED" : "DECLINED" } });
        if (body.approved) await prisma.dailyStudyRecord.update({ where: { id: context.today.id }, data: { carryOverMinutes: Math.ceil(context.carryPrompt.seconds / 60) } });
      }
    } else if (action === "completion_seen") {
      const context = await dailyContext(userId, timezone);
      await prisma.dailyStudyRecord.update({ where: { id: context.today.id }, data: { completionShown: true } });
    }
    return NextResponse.json(await serialize(userId, timezone));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Timer request failed." }, { status: 400 });
  }
}
