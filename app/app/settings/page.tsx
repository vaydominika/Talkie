import { auth } from "@/auth";
import { AvatarInput } from "@/components/avatar-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { updateProfileSettings } from "./actions";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Update your profile and daily study target.</p>
      </div>

      <Card className="max-w-xl"><CardContent><form action={updateProfileSettings} className="space-y-5">
        <AvatarInput initialImage={user.image} name={user.name} email={user.email} />
        <div className="space-y-1.5"><Label htmlFor="profile-name">Nickname</Label><Input
            id="profile-name"
            name="name"
            defaultValue={user.name ?? ""}
            placeholder="What should Talkie call you?"
          /></div>
        <div className="space-y-1.5"><Label htmlFor="daily-minutes">Daily study minutes</Label><Input
            id="daily-minutes"
            name="dailyMinutes"
            type="number"
            min={1}
            max={240}
            defaultValue={user.profile?.dailyMinutes ?? 15}
          /></div>
        <Button variant="accent">Save settings</Button>
      </form></CardContent></Card>
    </div>
  );
}
