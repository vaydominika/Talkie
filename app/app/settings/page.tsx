import { auth } from "@/auth";
import { AvatarInput } from "@/components/avatar-input";
import { Button } from "@/components/ui/button";
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
    <div className="animate-page-in space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Update your profile and daily study target.</p>
      </div>

      <form action={updateProfileSettings} className="max-w-xl space-y-5 rounded-lg border p-5">
        <AvatarInput initialImage={user.image} name={user.name} email={user.email} />
        <label className="block text-sm font-medium">
          Nickname
          <input
            name="name"
            defaultValue={user.name ?? ""}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
            placeholder="What should Talkie call you?"
          />
        </label>
        <label className="block text-sm font-medium">
          Daily study minutes
          <input
            name="dailyMinutes"
            type="number"
            min={1}
            max={240}
            defaultValue={user.profile?.dailyMinutes ?? 15}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-rose-400"
          />
        </label>
        <Button>Save settings</Button>
      </form>
    </div>
  );
}
