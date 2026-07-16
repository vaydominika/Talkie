import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completedCommitmentDays, goalStreak } from "@/lib/friends";
import { userTimezone } from "@/lib/learning-loop";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/timer";
import { sendFriendRequest, unblockFriend } from "./actions";
import { CommitmentCard, FriendCard, type CommitmentView } from "./friend-cards";
import { FriendsSettings } from "./friends-settings";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;
  const { q = "" } = await searchParams;
  const timezone = await userTimezone(userId);
  const today = dateKey(new Date(), timezone);

  const [user, connections, commitmentRows, searchResults, blocks, groups] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true, friendCode: true, friendDiscoverable: true, friendActivityVisible: true, friendNudgesEnabled: true } }),
    prisma.friendConnection.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, username: true, name: true, image: true, friendActivityVisible: true, dailyStudyRecords: { orderBy: { dateKey: "desc" }, take: 60 } } },
        userB: { select: { id: true, username: true, name: true, image: true, friendActivityVisible: true, dailyStudyRecords: { orderBy: { dateKey: "desc" }, take: 60 } } },
      },
    }),
    prisma.friendCommitment.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }], status: { in: ["PENDING", "ACTIVE", "COMPLETED"] } },
      include: {
        userA: { select: { id: true, username: true, name: true, dailyStudyRecords: { take: 14, orderBy: { dateKey: "desc" } } } },
        userB: { select: { id: true, username: true, name: true, dailyStudyRecords: { take: 14, orderBy: { dateKey: "desc" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    q.trim() ? prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { friendCode: { equals: q.trim().toUpperCase(), mode: "insensitive" } },
          { AND: [{ friendDiscoverable: true }, { username: { contains: q.trim().toLowerCase(), mode: "insensitive" } }] },
        ],
      },
      select: { id: true, username: true, name: true, image: true },
      take: 10,
    }) : Promise.resolve([]),
    prisma.userBlock.findMany({ where: { blockerId: userId }, include: { blocked: { select: { id: true, username: true, name: true } } } }),
    prisma.group.findMany({ where: { members: { some: { userId } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const friends = connections.map(item => item.userAId === userId ? item.userB : item.userA);
  const commitments: CommitmentView[] = commitmentRows.map(item => {
    const own = item.userAId === userId ? item.userA : item.userB;
    const friend = item.userAId === userId ? item.userB : item.userA;
    return {
      id: item.id,
      status: item.status,
      weekStart: item.weekStart,
      requestedById: item.requestedById,
      userAId: item.userAId,
      userBId: item.userBId,
      targetDaysA: item.targetDaysA,
      targetDaysB: item.targetDaysB,
      streakWeeks: item.streakWeeks,
      jointlySucceeded: item.jointlySucceeded,
      own: { name: displayName(own), username: own.username, progress: completedCommitmentDays(own.dailyStudyRecords, item.weekStart) },
      friend: { id: friend.id, name: displayName(friend), username: friend.username, progress: completedCommitmentDays(friend.dailyStudyRecords, item.weekStart) },
    };
  });

  return <div className="space-y-8">
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold">Friends</h1>
          <FriendsSettings
            username={user.username ?? ""}
            friendCode={user.friendCode}
            friendDiscoverable={user.friendDiscoverable}
            friendActivityVisible={user.friendActivityVisible}
            friendNudgesEnabled={user.friendNudgesEnabled}
          />
        </div>
        <p className="mt-1 text-muted-foreground">Find people, keep each other moving, and plan a week together.</p>
      </div>
    </header>

    <section aria-labelledby="friend-search-title">
      <h2 id="friend-search-title" className="sr-only">Find friends</h2>
      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input name="q" defaultValue={q} placeholder="Search by username or private friend code" aria-label="Search friends" className="h-11 w-full pl-10 pr-4" />
        <button type="submit" className="sr-only">Search</button>
      </form>
      {q.trim() && <div className="mt-3 grid gap-2">
        {searchResults.map(item => <article key={item.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
          <UserAvatar name={item.name} image={item.image} size="sm" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName(item)}</p>{item.username && <p className="truncate text-xs text-muted-foreground">@{item.username}</p>}</div>
          <form action={sendFriendRequest}><input type="hidden" name="recipientId" value={item.id} /><Button variant="outline" size="sm">Add friend</Button></form>
        </article>)}
        {!searchResults.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No people matched “{q.trim()}”.</p>}
      </div>}
    </section>

    <section>
      <div className="flex items-end justify-between gap-3"><div><h2 className="font-semibold">Your friends</h2><p className="mt-1 text-xs text-muted-foreground">Commitments and other actions now live on each friend card.</p></div><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{friends.length} total</span></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {friends.map(friend => {
          const daily = friend.dailyStudyRecords.find(item => item.dateKey === today);
          const status = !friend.friendActivityVisible ? "Activity private" : daily && daily.focusedSeconds >= (daily.targetMinutes + daily.carryOverMinutes) * 60 ? "Goal complete" : daily?.focusedSeconds ? "Studied today" : "Not studied yet";
          const commitment = commitments.find(item => item.friend.id === friend.id && (item.status === "PENDING" || item.status === "ACTIVE"));
          return <FriendCard key={friend.id} userId={userId} groups={groups} commitment={commitment} friend={{ id: friend.id, name: displayName(friend), username: friend.username, image: friend.image, status, streak: friend.friendActivityVisible ? goalStreak(friend.dailyStudyRecords) : 0 }} />;
        })}
        {!friends.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Search for someone above to start learning together.</p>}
      </div>
    </section>

    <section>
      <div><h2 className="font-semibold">Shared commitments</h2><p className="mt-1 text-xs text-muted-foreground">Separate targets, one shared week. Open a card to review or revise it.</p></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {commitments.map(item => <CommitmentCard key={item.id} commitment={item} userId={userId} />)}
        {!commitments.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2">Use the handshake icon on a friend card to propose your first commitment.</p>}
      </div>
    </section>

    {blocks.length > 0 && <section><h2 className="font-semibold">Blocked users</h2><div className="mt-3 flex flex-wrap gap-2">{blocks.map(item => <form key={item.id} action={unblockFriend} className="rounded-lg border p-3 text-sm"><input type="hidden" name="friendId" value={item.blocked.id} /><span>{personLabel(item.blocked)}</span><Button variant="ghost" size="sm" className="ml-2 text-destructive">Unblock</Button></form>)}</div></section>}
  </div>;
}

type PersonIdentity = { name: string | null; username: string | null };
function displayName(person: PersonIdentity) { return person.name?.trim() || (person.username ? `@${person.username}` : "Talkie user"); }
function personLabel(person: PersonIdentity) { const name = person.name?.trim(); return name && person.username ? `${name} (@${person.username})` : displayName(person); }
