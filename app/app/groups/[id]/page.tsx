import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { GroupTabs } from "@/components/group-tabs";
import {
  addGroupLanguage,
  addGroupVocabularyBulk,
  addGroupVocabulary,
  deleteGroup,
  deleteGroupVocabulary,
  removeGroupLanguage,
  removeGroupMember,
  updateGroup,
  updateGroupMemberRole,
  updateGroupVocabulary,
} from "../actions";
import { resetVocabularyReviewAttempts, saveVocabularyReviewAttempt } from "../../review/actions";

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
                  image: true,
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
                  code: true,
                  name: true,
                  nativeName: true,
                },
              },
            },
            orderBy: { displayForm: "asc" },
          },
          languages: {
            include: {
              language: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nativeName: true,
                },
              },
            },
            orderBy: {
              language: {
                name: "asc",
              },
            },
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
  const isOwner = membership.role === "OWNER";

  const groupLanguageIds = group.languages.map((item) => item.languageId);

  const [profileLanguages, profileVocabulary, reviewAttempts] = await Promise.all([
    prisma.language.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: { id: true, code: true, name: true, nativeName: true },
      orderBy: { name: "asc" },
    }),
    prisma.vocabularyEntry.findMany({
      where: {
        userId: session.user.id,
        groupId: null,
        languageId: { in: groupLanguageIds },
      },
      select: { displayForm: true, languageId: true },
    }),
    prisma.vocabularyReviewAttempt.findMany({
      where: {
        userId: session.user.id,
        groupId: group.id,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const personalKeys = new Set(profileVocabulary.map((word) => `${word.languageId}:${word.displayForm.toLowerCase().trim()}`));
  const groupKeysByLanguage = new Map<string, Set<string>>();
  const personalKeysByLanguage = new Map<string, Set<string>>();

  for (const word of group.vocabulary) {
    const keys = groupKeysByLanguage.get(word.languageId) ?? new Set<string>();
    keys.add(word.displayForm.toLowerCase().trim());
    groupKeysByLanguage.set(word.languageId, keys);
  }

  for (const word of profileVocabulary) {
    const keys = personalKeysByLanguage.get(word.languageId) ?? new Set<string>();
    keys.add(word.displayForm.toLowerCase().trim());
    personalKeysByLanguage.set(word.languageId, keys);
  }

  const syncCounts = group.languages.map((item) => {
    const groupKeys = groupKeysByLanguage.get(item.languageId) ?? new Set<string>();
    const mineKeys = personalKeysByLanguage.get(item.languageId) ?? new Set<string>();
    return {
      languageId: item.languageId,
      mineToGroupCount: [...mineKeys].filter((key) => !groupKeys.has(key)).length,
      groupToMineCount: [...groupKeys].filter((key) => !personalKeys.has(`${item.languageId}:${key}`)).length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={"/app/groups" as Route} className="text-xs font-semibold text-rose-600 hover:underline">
            &larr; Back to Groups
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

      {isOwner && (
        <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_auto]">
          <form action={updateGroup} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
            <input type="hidden" name="groupId" value={group.id} />
            <label className="text-sm font-medium">
              Name
              <input name="name" defaultValue={group.name} required className="mt-1 h-10 w-full rounded-md border bg-background px-3" />
            </label>
            <label className="text-sm font-medium">
              Description
              <input name="description" defaultValue={group.description ?? ""} className="mt-1 h-10 w-full rounded-md border bg-background px-3" />
            </label>
            <button className="self-end rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Save group</button>
          </form>
          <ConfirmActionForm
            action={deleteGroup}
            fields={{ groupId: group.id }}
            title="Delete group"
            description={`Delete ${group.name}? This cannot be undone.`}
            confirmLabel="Delete group"
            className="self-end"
            buttonClassName="rounded-md border px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Delete group
          </ConfirmActionForm>
        </div>
      )}

      <GroupTabs
        groupId={group.id}
        words={group.vocabulary}
        members={group.members}
        groupLanguages={group.languages.map((item) => item.language)}
        availableLanguages={profileLanguages}
        syncCounts={syncCounts}
        reviewAttempts={reviewAttempts}
        allowMemberImports={group.allowMemberImports}
        currentUserRole={membership.role}
        currentUserId={session.user.id}
        addWordAction={addGroupVocabulary}
        addWordsBulkAction={addGroupVocabularyBulk}
        updateWordAction={updateGroupVocabulary}
        deleteWordAction={deleteGroupVocabulary}
        addLanguageAction={addGroupLanguage}
        removeLanguageAction={removeGroupLanguage}
        updateMemberRoleAction={updateGroupMemberRole}
        removeMemberAction={removeGroupMember}
        saveAttemptAction={saveVocabularyReviewAttempt}
        resetAttemptsAction={resetVocabularyReviewAttempts}
      />
    </div>
  );
}
