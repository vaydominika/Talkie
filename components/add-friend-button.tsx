"use client";

import { useState, useTransition } from "react";
import { Clock3, UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendFriendRequest, type FriendRequestState } from "@/app/app/friends/actions";

export function AddFriendButton({ recipientId, initialStatus = "NONE", groupId, iconOnly = false }: {
  recipientId: string;
  initialStatus?: FriendRequestState;
  groupId?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const disabled = pending || status === "PENDING" || status === "FRIENDS";
  const label = pending ? "Sending request" : status === "FRIENDS" ? "Already friends" : status === "PENDING" ? "Friend request sent" : status === "INCOMING" ? "Accept friend request" : "Add friend";

  const submit = () => startTransition(async () => {
    setMessage("");
    const formData = new FormData();
    formData.set("recipientId", recipientId);
    if (groupId) {
      formData.set("source", "group");
      formData.set("groupId", groupId);
    }
    try {
      const result = await sendFriendRequest(formData);
      setStatus(result.status);
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Friend request could not be sent.");
    }
  });

  return <div className={iconOnly ? "inline-flex" : "flex flex-col items-end gap-1"}>
    <Button type="button" variant="outline" size={iconOnly ? "icon-sm" : "sm"} onClick={submit} disabled={disabled} aria-label={label} title={label}>
      {status === "FRIENDS" ? <UserCheck /> : status === "PENDING" || pending ? <Clock3 /> : <UserPlus />}
      {!iconOnly && <span>{label}</span>}
    </Button>
    {message && <span className={iconOnly ? "sr-only" : "max-w-44 text-right text-xs text-muted-foreground"} aria-live="polite">{message}</span>}
  </div>;
}
