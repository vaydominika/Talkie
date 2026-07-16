"use client";

import { useState } from "react";
import { BellRing, Handshake, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  blockFriend,
  cancelCommitment,
  createCommitment,
  inviteFriendToGroup,
  inviteFriendToGroupTimer,
  nudgeFriend,
  removeFriend,
  respondCommitment,
  updateCommitment,
} from "./actions";

export type CommitmentView = {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "DECLINED" | "CANCELED";
  weekStart: string;
  requestedById: string;
  userAId: string;
  userBId: string;
  targetDaysA: number;
  targetDaysB: number;
  streakWeeks: number;
  jointlySucceeded: boolean | null;
  own: { name: string; username: string | null; progress: number };
  friend: { id: string; name: string; username: string | null; progress: number };
};

type FriendView = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  status: string;
  streak: number;
};

type GroupOption = { id: string; name: string };

export function FriendCard({ friend, userId, groups, commitment }: { friend: FriendView; userId: string; groups: GroupOption[]; commitment?: CommitmentView }) {
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return <article className="flex min-h-40 flex-col justify-between rounded-lg border bg-background p-4">
    <div className="flex items-start gap-3">
      <UserAvatar name={friend.name} image={friend.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{friend.name}</p>
        {friend.username && <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>}
      </div>
      <div className="flex items-center gap-1">
        <form action={nudgeFriend}>
          <input type="hidden" name="friendId" value={friend.id} />
          <IconButton label={`Nudge ${friend.name}`}><BellRing /></IconButton>
        </form>
        <IconButton label={`Open commitment with ${friend.name}`} onClick={() => setCommitmentOpen(true)} active={Boolean(commitment)}><Handshake /></IconButton>
        <IconButton label={`More actions for ${friend.name}`} onClick={() => setMoreOpen(true)}><MoreHorizontal /></IconButton>
      </div>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3 border-t pt-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-1.5 rounded-full ${statusDot(friend.status)}`} />{friend.status}</p>
      <p className="text-xs text-muted-foreground">{friend.streak} day streak</p>
    </div>

    {commitmentOpen && <CommitmentDialog commitment={commitment} friend={friend} userId={userId} onClose={() => setCommitmentOpen(false)} />}
    {moreOpen && <AppModal title={friend.name} description="Invitations and relationship controls." onClose={() => setMoreOpen(false)}>
      <div className="space-y-3">
        {groups.length > 0 && <form action={inviteFriendToGroup} className="flex gap-2">
          <input type="hidden" name="friendId" value={friend.id} />
          <FormSelect name="groupId" defaultValue={groups[0]?.id} className="min-w-0 flex-1" ariaLabel="Group" options={groups.map(group => ({ value: group.id, label: group.name }))} />
          <Button variant="outline">Invite to group</Button>
        </form>}
        <form action={inviteFriendToGroupTimer}>
          <input type="hidden" name="friendId" value={friend.id} />
          <Button variant="outline" className="w-full">Invite to active group timer</Button>
        </form>
        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <form action={removeFriend}><input type="hidden" name="friendId" value={friend.id} /><Button variant="ghost" className="w-full text-muted-foreground">Remove friend</Button></form>
          <form action={blockFriend}><input type="hidden" name="friendId" value={friend.id} /><Button variant="ghost" className="w-full text-destructive">Block</Button></form>
        </div>
      </div>
    </AppModal>}
  </article>;
}

export function CommitmentCard({ commitment, userId }: { commitment: CommitmentView; userId: string }) {
  const [open, setOpen] = useState(false);
  const editable = commitment.status === "PENDING" || commitment.status === "ACTIVE";
  const incoming = commitment.status === "PENDING" && commitment.requestedById !== userId;

  return <article className="rounded-lg border bg-background p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">You + {commitment.friend.name}</p>
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${commitmentTone(commitment.status)}`}>{commitmentLabel(commitment.status, incoming)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Week of {commitment.weekStart}{commitment.streakWeeks ? ` · ${commitment.streakWeeks} week streak` : ""}</p>
      </div>
      {editable && <IconButton label={incoming ? "Review commitment" : "Edit commitment"} onClick={() => setOpen(true)}>{incoming ? <Handshake /> : <Pencil />}</IconButton>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <ProgressStat label="You" progress={commitment.own.progress} target={userId === commitment.userAId ? commitment.targetDaysA : commitment.targetDaysB} />
      <ProgressStat label={commitment.friend.name} progress={commitment.friend.progress} target={userId === commitment.userAId ? commitment.targetDaysB : commitment.targetDaysA} />
    </div>
    {commitment.status === "COMPLETED" && <p className="mt-3 text-xs text-muted-foreground">{commitment.jointlySucceeded ? "You both reached your targets." : "This week finished below one or both targets."}</p>}
    {open && <CommitmentDialog commitment={commitment} friend={commitment.friend} userId={userId} onClose={() => setOpen(false)} />}
  </article>;
}

function CommitmentDialog({ commitment, friend, userId, onClose }: { commitment?: CommitmentView; friend: Pick<FriendView, "id" | "name">; userId: string; onClose: () => void }) {
  const [error, setError] = useState("");
  const incoming = commitment?.status === "PENDING" && commitment.requestedById !== userId;
  const myTarget = commitment ? (userId === commitment.userAId ? commitment.targetDaysA : commitment.targetDaysB) : 4;
  const friendTarget = commitment ? (userId === commitment.userAId ? commitment.targetDaysB : commitment.targetDaysA) : 4;

  const submit = (action: (formData: FormData) => Promise<void>) => async (formData: FormData) => {
    setError("");
    try { await action(formData); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The commitment could not be saved."); }
  };

  return <AppModal title={commitment ? `Commitment with ${friend.name}` : `New commitment with ${friend.name}`} description={incoming ? `${friend.name} proposed separate weekly targets.` : commitment?.status === "ACTIVE" ? "Changing an active commitment sends a new proposal for approval." : "Set a target for each person for next week."} onClose={onClose}>
    {incoming ? <form action={submit(respondCommitment)} className="space-y-4">
      <input type="hidden" name="commitmentId" value={commitment.id} />
      <TargetInput name="ownTarget" label="Your target" defaultValue={myTarget} />
      <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{friend.name}&apos;s target: <span className="font-medium text-foreground">{friendTarget} days</span></p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2"><Button name="decision" value="decline" variant="outline">Decline</Button><Button name="decision" value="accept" variant="accent">Accept</Button></div>
    </form> : <>
      <form action={submit(commitment ? updateCommitment : createCommitment)} className="space-y-4">
        {commitment ? <input type="hidden" name="commitmentId" value={commitment.id} /> : <input type="hidden" name="friendId" value={friend.id} />}
        <div className="grid grid-cols-2 gap-3"><TargetInput name="myTarget" label="Your target" defaultValue={myTarget} /><TargetInput name="friendTarget" label={`${friend.name}'s target`} defaultValue={friendTarget} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="accent" className="w-full">{commitment ? "Send updated proposal" : "Propose commitment"}</Button>
      </form>
      {commitment && <form action={submit(cancelCommitment)} className="mt-3 border-t pt-3"><input type="hidden" name="commitmentId" value={commitment.id} /><Button variant="ghost" className="w-full text-destructive"><Trash2 />Delete commitment</Button></form>}
    </>}
  </AppModal>;
}

function TargetInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span><Input name={name} type="number" min={1} max={7} defaultValue={defaultValue} required /><span className="block text-xs font-normal text-muted-foreground">days per week</span></label>;
}

function IconButton({ label, children, onClick, active = false }: { label: string; children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><Button type={onClick ? "button" : "submit"} variant="ghost" size="icon-sm" onClick={onClick} aria-label={label} className={`relative ${active ? "text-foreground" : "text-muted-foreground"}`}>{children}{active && <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-ring" />}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function ProgressStat({ label, progress, target }: { label: string; progress: number; target: number }) {
  const percent = Math.min(100, Math.round(progress / Math.max(1, target) * 100));
  return <div className="rounded-md border p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">{label}</span><span className="font-medium">{progress}/{target}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-ring transition-[width]" style={{ width: `${percent}%` }} /></div></div>;
}

function statusDot(status: string) { return status === "Goal complete" ? "bg-emerald-500" : status === "Studied today" ? "bg-ring" : "bg-muted-foreground/50"; }
function commitmentLabel(status: CommitmentView["status"], incoming: boolean) { return status === "PENDING" ? (incoming ? "Needs your reply" : "Awaiting reply") : status === "ACTIVE" ? "Active" : status === "COMPLETED" ? "Completed" : status.toLowerCase(); }
function commitmentTone(status: CommitmentView["status"]) { return status === "ACTIVE" ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : status === "PENDING" ? "border-ring/40 text-foreground" : "text-muted-foreground"; }
