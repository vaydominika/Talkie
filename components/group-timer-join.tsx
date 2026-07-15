"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/components/timer-provider";

export function GroupTimerJoin({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { snapshot, joinGroup, leaveGroup, busy, setOpen } = useTimer();
  const joined = snapshot?.group?.group.id === groupId;
  return joined ? (
    <div className="flex items-center gap-2 rounded-lg border border-ring/40 bg-accent/30 px-3 py-2 dark:border-ring/40 dark:bg-accent/10">
      <span className="h-2 w-2 animate-pulse rounded-full bg-ring" />
      <span className="text-sm font-medium">Joined group timer</span>
      <Button type="button" variant="link" size="sm" className="ml-2 h-auto px-0 text-xs" onClick={() => setOpen(true)}>Open</Button>
      <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs text-muted-foreground" onClick={leaveGroup}>Leave</Button>
    </div>
  ) : (
    <Button disabled={busy} variant="outline" onClick={() => joinGroup(groupId)} className="border-ring/40 text-foreground hover:bg-accent/30 dark:border-ring/40">
      <Users className="mr-2 h-4 w-4" />Join {groupName} timer
    </Button>
  );
}
