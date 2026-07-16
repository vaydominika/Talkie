"use client";

import { Bell, Clock3, Eye, EyeOff, Handshake, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  cancelFriendRequest,
  cancelGroupInvitation,
  cancelGroupTimerInvitation,
  markNotificationsRead,
  markNotificationsUnread,
  respondCommitment,
  respondFriendRequest,
  respondGroupInvitation,
  respondGroupTimerInvitation,
} from "@/app/app/friends/actions";

type PersonRequest = { id: string; person: string };
type GroupRequest = PersonRequest & { group: string };
type CommitmentRequest = PersonRequest & { ownTarget: number; friendTarget: number };
type SentItem = { id: string; kind: "friend" | "group" | "timer"; label: string };
type ActivityItem = { id: string; type: string; actor: string; read: boolean; createdAt: string };

export type NotificationMenuProps = {
  now: string;
  unread: number;
  friendRequests: PersonRequest[];
  groupInvites: GroupRequest[];
  timerInvites: GroupRequest[];
  commitmentRequests: CommitmentRequest[];
  sent: SentItem[];
  activity: ActivityItem[];
};

export function NotificationMenu(props: NotificationMenuProps) {
  const actionable = props.friendRequests.length + props.groupInvites.length + props.timerInvites.length + props.commitmentRequests.length;
  const count = Math.max(props.unread, actionable);

  return <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="icon" aria-label={`${count} notifications`} className="relative">
        <Bell />
        {count > 0 && <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-md bg-ring px-1 text-[9px] font-semibold text-background">{Math.min(count, 99)}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="max-h-[min(38rem,calc(100vh-5rem))] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-0">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-popover px-4 py-3">
        <div><h2 className="font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">Requests, invitations, and recent activity</p></div>
        {props.activity.length > 0 && <form action={props.unread > 0 ? markNotificationsRead : markNotificationsUnread}>
          <Button variant="ghost" size="sm" aria-label={props.unread > 0 ? "Mark all notifications read" : "Mark all notifications unread"} title={props.unread > 0 ? "Mark all as read" : "Mark all as unread"} className="bg-transparent! px-2 text-xs text-muted-foreground hover:bg-transparent! hover:text-foreground">
            {props.unread > 0 ? <Eye /> : <EyeOff />} All
          </Button>
        </form>}
      </div>

      <div className="space-y-5 p-4">
        {actionable > 0 && <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Needs your attention</h3><div className="space-y-2">
          {props.friendRequests.map(item => <ActionItem key={item.id} icon={<UserPlus />} title={item.person} detail="Sent you a friend request"><form action={respondFriendRequest} className="flex gap-1"><input type="hidden" name="requestId" value={item.id} /><DecisionButtons /></form></ActionItem>)}
          {props.groupInvites.map(item => <ActionItem key={item.id} icon={<Users />} title={item.person} detail={`Invited you to ${item.group}`}><form action={respondGroupInvitation} className="flex gap-1"><input type="hidden" name="invitationId" value={item.id} /><DecisionButtons /></form></ActionItem>)}
          {props.timerInvites.map(item => <ActionItem key={item.id} icon={<Clock3 />} title={item.person} detail={`Invited you to the ${item.group} timer`}><form action={respondGroupTimerInvitation} className="flex gap-1"><input type="hidden" name="invitationId" value={item.id} /><DecisionButtons acceptLabel="Join" /></form></ActionItem>)}
          {props.commitmentRequests.map(item => <ActionItem key={item.id} icon={<Handshake />} title={item.person} detail={`Proposed ${item.friendTarget} days for them and ${item.ownTarget} for you`}><form action={respondCommitment} className="flex items-center gap-1"><input type="hidden" name="commitmentId" value={item.id} /><input type="hidden" name="ownTarget" value={item.ownTarget} /><DecisionButtons /></form></ActionItem>)}
        </div></section>}

        {props.sent.length > 0 && <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sent and waiting</h3><div className="space-y-1">{props.sent.map(item => <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2 rounded-md border px-3 py-2"><p className="min-w-0 flex-1 truncate text-xs">{item.label}</p><form action={item.kind === "friend" ? cancelFriendRequest : item.kind === "group" ? cancelGroupInvitation : cancelGroupTimerInvitation}><input type="hidden" name={item.kind === "friend" ? "requestId" : "invitationId"} value={item.id} /><Button variant="ghost" size="icon-xs" aria-label={`Cancel ${item.label}`}><X /></Button></form></div>)}</div></section>}

        <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent activity</h3><div className="space-y-1">
          {props.activity.map(item => <div key={item.id} className={`rounded-md px-3 py-2 text-sm ${item.read ? "text-muted-foreground" : "bg-muted/60 text-foreground"}`}><p><span className="font-medium">{item.actor}</span> {activityText(item.type)}</p><time className="mt-0.5 block text-[10px] text-muted-foreground" dateTime={item.createdAt}>{relativeTime(item.createdAt, props.now)}</time></div>)}
          {!props.activity.length && !actionable && <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
        </div></section>
      </div>
    </PopoverContent>
  </Popover>;
}

function ActionItem({ icon, title, detail, children }: { icon: React.ReactNode; title: string; detail: string; children: React.ReactNode }) {
  return <article className="rounded-md border p-3"><div className="flex gap-3"><div className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div></div><div className="mt-3 flex justify-end">{children}</div></article>;
}

function DecisionButtons({ acceptLabel = "Accept" }: { acceptLabel?: string }) { return <><Button name="decision" value="decline" variant="ghost" size="xs">Decline</Button><Button name="decision" value="accept" variant="accent" size="xs">{acceptLabel}</Button></>; }
function activityText(type: string) { const labels: Record<string, string> = { FRIEND_REQUEST: "sent you a friend request.", FRIEND_ACCEPTED: "accepted your friend request.", COMMITMENT_REQUEST: "sent a commitment proposal.", COMMITMENT_ACCEPTED: "accepted your commitment.", COMMITMENT_COMPLETE: "completed a shared commitment with you.", NUDGE: "nudged you to study.", GROUP_INVITATION: "sent a group invitation.", GROUP_TIMER_INVITATION: "sent a group timer invitation." }; return labels[type] ?? type.toLowerCase().replaceAll("_", " "); }
function relativeTime(value: string, now: string) { const minutes = Math.max(0, Math.floor((new Date(now).getTime() - new Date(value).getTime()) / 60000)); return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`; }
