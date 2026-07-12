"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/components/timer-provider";

export function GroupTimerJoin({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { snapshot, joinGroup, leaveGroup, busy, setOpen } = useTimer();
  const joined = snapshot?.group?.group.id === groupId;
  return joined ? (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/40">
      <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
      <span className="text-sm font-medium">Joined group timer</span>
      <button type="button" className="ml-2 text-xs text-indigo-700 underline" onClick={() => setOpen(true)}>Open</button>
      <button type="button" className="text-xs text-muted-foreground underline" onClick={leaveGroup}>Leave</button>
    </div>
  ) : (
    <Button disabled={busy} variant="outline" onClick={() => joinGroup(groupId)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900">
      <Users className="mr-2 h-4 w-4" />Join {groupName} timer
    </Button>
  );
}
