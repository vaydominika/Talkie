"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateFriendProfile, type FriendProfileState } from "./actions";

type FriendProfileFormProps = {
  username: string;
  friendDiscoverable: boolean;
  friendGroupDiscoverable: boolean;
  friendActivityVisible: boolean;
  friendNudgesEnabled: boolean;
};

export function FriendProfileForm(props: FriendProfileFormProps) {
  const initialState: FriendProfileState = { status: "idle", username: props.username };
  const [state, action, pending] = useActionState(updateFriendProfile, initialState);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!state.message) return;
    setShowMessage(true);
    const timeout = window.setTimeout(() => setShowMessage(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div><h3 className="font-semibold">Friend profile</h3>
      <p className="mt-1 text-xs text-muted-foreground">Your username is unique and separate from the nickname shown on your profile.</p>
      </div>
      <label className="block text-sm font-medium">
        Username
        <Input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          defaultValue={state.username}
          aria-invalid={state.status === "error"}
          aria-describedby="friend-username-help friend-profile-status"
          className="mt-1 h-10 w-full rounded-md border bg-background px-3"
        />
      </label>
      <p id="friend-username-help" className="mt-1.5 text-xs text-muted-foreground">Letters, numbers, and underscores only.</p>
      <div className="space-y-2 text-sm">
        <Toggle name="friendDiscoverable" checked={props.friendDiscoverable}>Allow username search</Toggle>
        <Toggle name="friendGroupDiscoverable" checked={props.friendGroupDiscoverable}>Allow group members to add me</Toggle>
        <Toggle name="friendActivityVisible" checked={props.friendActivityVisible}>Show goal status to friends</Toggle>
        <Toggle name="friendNudgesEnabled" checked={props.friendNudgesEnabled}>Allow friend nudges</Toggle>
      </div>
      {showMessage && state.message && (
        <p
          id="friend-profile-status"
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-md px-3 py-2 text-sm ${state.status === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}
        >
          {state.message}
        </p>
      )}
      <Button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function Toggle({ name, checked, children }: { name: string; checked: boolean; children: React.ReactNode }) {
  return <label className="flex items-center justify-between gap-3"><span>{children}</span><Switch name={name} defaultChecked={checked} /></label>;
}
