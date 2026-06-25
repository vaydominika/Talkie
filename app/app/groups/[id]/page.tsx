import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GroupTabs } from "@/components/group-tabs";
import { addGroupVocabulary } from "../actions";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;

  // Retrieve group and confirm membership
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: id,
        userId: session.user.id,
      },
    },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
          vocabulary: {
            include: {
              translations: true,
              japanese: true,
              language: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { displayForm: "asc" },
          },
        },
      },
    },
  });

  if (!membership) {
    // If not a member, redirect to groups directory
    redirect("/app/groups");
  }

  const { group } = membership;

  // Get active languages in the app for adding vocabulary
  const languages = await prisma.language.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={"/app/groups" as Route} className="text-xs font-semibold text-rose-600 hover:underline">
            ← Back to Groups
          </Link>
          <h1 className="text-3xl font-bold mt-1">{group.name}</h1>
          {group.description && <p className="text-muted-foreground mt-1 text-sm">{group.description}</p>}
        </div>

        {/* Invite Code card */}
        <Card className="bg-[#fbfaf4] border-rose-100 dark:bg-stone-900/50">
          <CardContent className="p-4 flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Invite Code</span>
            <span className="text-2xl font-mono font-bold text-rose-700 tracking-wider mt-1">
              {group.inviteCode}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">Share this code with others to invite them</p>
          </CardContent>
        </Card>
      </div>

      <GroupTabs
        groupId={group.id}
        words={group.vocabulary}
        members={group.members}
        languages={languages}
        allowMemberImports={group.allowMemberImports}
        currentUserRole={membership.role}
        addWordAction={addGroupVocabulary}
      />
    </div>
  );
}
