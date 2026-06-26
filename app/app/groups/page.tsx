import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createGroup, joinGroup, previewGroupInvite } from "./actions";
import { GroupModalActions } from "@/components/group-modal-actions";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [memberships, languages, personalVocabulary] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                vocabulary: true,
                languages: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.language.findMany({
      where: { users: { some: { userId: session.user.id } } },
      select: { id: true, code: true, name: true, nativeName: true },
      orderBy: { name: "asc" },
    }),
    prisma.vocabularyEntry.findMany({
      where: { userId: session.user.id, groupId: null },
      select: {
        id: true,
        displayForm: true,
        languageId: true,
        translations: { select: { text: true } },
      },
      orderBy: { displayForm: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Study Groups</h1>
          <p className="mt-1 text-muted-foreground">
            Create a group to share vocabulary and practice flashcards together with friends.
          </p>
        </div>
        <GroupModalActions
          createGroupAction={createGroup}
          joinGroupAction={joinGroup}
          previewGroupInviteAction={previewGroupInvite}
          languages={languages}
          personalVocabulary={personalVocabulary}
        />
      </div>

      <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Groups</h2>
          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center bg-muted/20">
              <p className="text-muted-foreground">You are not in any study groups yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create one or join using an invite code!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {memberships.map((m) => (
                <Card key={m.group.id} className="hover:border-rose-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-bold leading-tight">{m.group.name}</CardTitle>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                        {m.role}
                      </span>
                    </div>
                    {m.group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.group.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                      <span>{m.group._count.members} member(s)</span>
                      <span>
                        {m.group._count.languages} language(s) / {m.group._count.vocabulary} word(s)
                      </span>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/app/groups/${m.group.id}` as Route}>Enter Group</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
