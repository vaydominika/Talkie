"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Generate a random 6-character alphanumeric code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Shared helper to copy vocabulary entries while avoiding duplicates
async function importVocabularyToGroup(groupId: string, importedVocabIdsStr: string) {
  if (!importedVocabIdsStr) return;
  try {
    const ids = JSON.parse(importedVocabIdsStr) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return;

    // Fetch vocabulary entries already in the group to filter duplicates
    const existingGroupVocab = await prisma.vocabularyEntry.findMany({
      where: { groupId },
      select: { displayForm: true, languageId: true },
    });

    const existingKeys = new Set(
      existingGroupVocab.map((v) => `${v.languageId}:${v.displayForm.toLowerCase().trim()}`)
    );

    const originals = await prisma.vocabularyEntry.findMany({
      where: { id: { in: ids } },
      include: {
        translations: true,
        japanese: true,
        german: true,
      },
    });

    for (const orig of originals) {
      const key = `${orig.languageId}:${orig.displayForm.toLowerCase().trim()}`;
      if (existingKeys.has(key)) {
        // Skip duplicate
        continue;
      }

      await prisma.vocabularyEntry.create({
        data: {
          id: crypto.randomUUID(),
          groupId,
          languageId: orig.languageId,
          levelId: orig.levelId,
          displayForm: orig.displayForm,
          definition: orig.definition,
          partOfSpeech: orig.partOfSpeech,
          sourceMetadata: orig.sourceMetadata ?? undefined,
          translations: {
            create: orig.translations.map((t) => ({ text: t.text })),
          },
          japanese: orig.japanese
            ? {
                create: {
                  kana: orig.japanese.kana,
                  romaji: orig.japanese.romaji,
                  jlpt: orig.japanese.jlpt,
                },
              }
            : undefined,
          german: orig.german
            ? {
                create: {
                  article: orig.german.article,
                  plural: orig.german.plural,
                },
              }
            : undefined,
        },
      });

      // Add to our list so we don't duplicate within this import batch
      existingKeys.add(key);
    }
  } catch (e) {
    console.error("Failed to import vocabulary", e);
  }
}

export async function createGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const importVocab = formData.get("importVocab") === "on";
  const importedVocabIdsStr = String(formData.get("importedVocabIds") ?? "");

  if (!name) throw new Error("Group name is required");

  // Keep trying if code collides
  let inviteCode = generateInviteCode();
  while (true) {
    const existing = await prisma.group.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const group = await prisma.group.create({
    data: {
      name,
      description,
      inviteCode,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
  });

  if (importVocab && importedVocabIdsStr) {
    await importVocabularyToGroup(group.id, importedVocabIdsStr);
  }

  revalidatePath("/app/groups");
  redirect(`/app/groups/${group.id}`);
}

export async function joinGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  const importVocab = formData.get("importVocab") === "on";
  const importedVocabIdsStr = String(formData.get("importedVocabIds") ?? "");

  if (!inviteCode) throw new Error("Invite code is required");

  const group = await prisma.group.findUnique({
    where: { inviteCode },
  });

  if (!group) {
    throw new Error("Group not found with that invite code");
  }

  // Check if already a member
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: "MEMBER",
      },
    });
  }

  // Only import if owner allows or user is the owner (which they aren't since they just joined)
  if (importVocab && importedVocabIdsStr && group.allowMemberImports) {
    await importVocabularyToGroup(group.id, importedVocabIdsStr);
  }

  revalidatePath("/app/groups");
  redirect(`/app/groups/${group.id}`);
}

export async function addGroupVocabulary(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const languageId = String(formData.get("languageId") ?? "");
  const word = String(formData.get("word") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();

  if (!groupId || !languageId || !word || !meaning) {
    throw new Error("All fields are required");
  }

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("You must be a member of the group to add vocabulary.");
  }

  // Check if word already exists in group
  const existing = await prisma.vocabularyEntry.findFirst({
    where: {
      groupId,
      languageId,
      displayForm: {
        equals: word,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error("This word is already in the group vocabulary list.");
  }

  const id = crypto.randomUUID();
  await prisma.vocabularyEntry.create({
    data: {
      id,
      groupId,
      languageId,
      displayForm: word,
      definition: meaning,
      translations: { create: { text: meaning } },
    },
  });

  revalidatePath(`/app/groups/${groupId}`);
}

// Action to trigger vocabulary import manually post-join
export async function importVocabularyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const importedVocabIdsStr = String(formData.get("importedVocabIds") ?? "");

  if (!groupId || !importedVocabIdsStr) throw new Error("Missing parameters");

  // Verify membership and group info
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
    include: {
      group: true,
    },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  // Allowed if OWNER, ADMIN or if Group allows member imports
  const isAllowed =
    membership.role === "OWNER" ||
    membership.role === "ADMIN" ||
    membership.group.allowMemberImports;

  if (!isAllowed) {
    throw new Error("The group owner does not allow members to import vocabulary.");
  }

  await importVocabularyToGroup(groupId, importedVocabIdsStr);
  revalidatePath(`/app/groups/${groupId}`);
}

// Toggle permission for member imports
export async function toggleGroupMemberImportsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const allow = formData.get("allowMemberImports") === "on";

  if (!groupId) throw new Error("Missing group ID");

  // Verify user is Owner or Admin
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("Only owners and admins can toggle group settings.");
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { allowMemberImports: allow },
  });

  revalidatePath(`/app/groups/${groupId}`);
}
