"use client";

import { useState } from "react";
import { RefreshCcw, Settings2 } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initializeFriendCode, regenerateFriendCode } from "./actions";
import { FriendProfileForm } from "./friend-profile-form";

type FriendsSettingsProps = {
  username: string;
  friendCode: string | null;
  friendDiscoverable: boolean;
  friendActivityVisible: boolean;
  friendNudgesEnabled: boolean;
};

export function FriendsSettings(props: FriendsSettingsProps) {
  const [open, setOpen] = useState(false);

  return <>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Open friend settings" className="bg-transparent! text-muted-foreground hover:bg-transparent! hover:text-foreground">
          <Settings2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Friend settings</TooltipContent>
    </Tooltip>
    {open && <AppModal title="Friend settings" description="Control how people find you and manage your private friend code." onClose={() => setOpen(false)}>
      <FriendProfileForm
        username={props.username}
        friendDiscoverable={props.friendDiscoverable}
        friendActivityVisible={props.friendActivityVisible}
        friendNudgesEnabled={props.friendNudgesEnabled}
      />
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold">Private friend code</h3>
        <p className="mt-1 text-xs text-muted-foreground">Share this code directly when username search is not enough.</p>
        {props.friendCode ? <div className="mt-3 flex items-center gap-2">
          <p className="font-mono text-2xl tracking-[.16em]">{props.friendCode}</p>
          <form action={regenerateFriendCode}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label="Regenerate friend code" className="bg-transparent! text-muted-foreground hover:bg-transparent! hover:text-foreground"><RefreshCcw /></Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate code</TooltipContent>
            </Tooltip>
          </form>
        </div> : <form action={initializeFriendCode}><Button className="mt-3" variant="outline">Create private code</Button></form>}
      </div>
    </AppModal>}
  </>;
}
