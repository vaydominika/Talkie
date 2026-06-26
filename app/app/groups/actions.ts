"use server";

import { auth } from "@/auth";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

async function requireGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("You must be a member of the group to do that.");
  }

  return membership;
}

async function requireGroupOwner(groupId: string, userId: string) {
  const membership = await requireGroupMember(groupId, userId);
  if (membership.role !== "OWNER") {
    throw new Error("Only the group owner can manage members.");
  }
  return membership;
}

type VocabularyToCopy = Awaited<ReturnType<typeof getVocabularyEntriesToCopy>>[number];

async function getVocabularyEntriesToCopy(where: Prisma.VocabularyEntryWhereInput) {
  return prisma.vocabularyEntry.findMany({
    where,
    include: {
      translations: true,
      japanese: true,
      german: true,
    },
    orderBy: { displayForm: "asc" },
  });
}

function vocabularyKey(entry: { languageId: string; displayForm: string }) {
  return `${entry.languageId}:${entry.displayForm.toLowerCase().trim()}`;
}

function copiedVocabularyData(orig: VocabularyToCopy, target: { groupId?: string; userId?: string }) {
  return {
    id: crypto.randomUUID(),
    groupId: target.groupId,
    userId: target.userId,
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
  };
}

async function copyVocabularyToGroup(groupId: string, originals: VocabularyToCopy[]) {
  const existingGroupVocab = await prisma.vocabularyEntry.findMany({
    where: { groupId },
    select: { displayForm: true, languageId: true },
  });

  const existingKeys = new Set(existingGroupVocab.map(vocabularyKey));
  const importedLanguageIds = [...new Set(originals.map((orig) => orig.languageId))];

  if (importedLanguageIds.length > 0) {
    await prisma.groupLanguage.createMany({
      data: importedLanguageIds.map((languageId) => ({ groupId, languageId })),
      skipDuplicates: true,
    });
  }

  for (const orig of originals) {
    const key = vocabularyKey(orig);
    if (existingKeys.has(key)) continue;

    await prisma.vocabularyEntry.create({
      data: copiedVocabularyData(orig, { groupId }),
    });

    existingKeys.add(key);
  }
}

async function copyVocabularyToProfile(userId: string, originals: VocabularyToCopy[]) {
  const existingProfileVocab = await prisma.vocabularyEntry.findMany({
    where: { userId, groupId: null },
    select: { displayForm: true, languageId: true },
  });

  const existingKeys = new Set(existingProfileVocab.map(vocabularyKey));

  for (const orig of originals) {
    const key = vocabularyKey(orig);
    if (existingKeys.has(key)) continue;

    await prisma.vocabularyEntry.create({
      data: copiedVocabularyData(orig, { userId }),
    });

    existingKeys.add(key);
  }
}

async function revalidateLanguage(languageId: string) {
  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: { code: true, name: true, nativeName: true },
  });
  if (language) revalidatePath(languageHref(language));
}

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
async function importVocabularyToGroup(groupId: string, importedVocabIdsStr: string, languageId?: string) {
  if (!importedVocabIdsStr) return;
  try {
    const ids = JSON.parse(importedVocabIdsStr) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return;

    const originals = await getVocabularyEntriesToCopy({
      id: { in: ids },
      ...(languageId ? { languageId } : {}),
    });

    await copyVocabularyToGroup(groupId, originals);
  } catch (e) {
    console.error("Failed to import vocabulary", e);
  }
}

export async function importProfileVocabularyToGroupAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const languageId = String(formData.get("languageId") ?? "");

  if (!groupId || !languageId) throw new Error("Missing parameters");

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
    include: { group: true },
  });

  if (!membership) throw new Error("Not a member of this group");

  const isAllowed =
    membership.role === "OWNER" ||
    membership.role === "ADMIN" ||
    membership.group.allowMemberImports;

  if (!isAllowed) {
    throw new Error("The group owner does not allow members to import vocabulary.");
  }

  const originals = await getVocabularyEntriesToCopy({
    languageId,
    userId: session.user.id,
    groupId: null,
  });

  await copyVocabularyToGroup(groupId, originals);
  revalidatePath(`/app/groups/${groupId}`);
}

export async function importGroupVocabularyToProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const languageId = String(formData.get("languageId") ?? "");

  if (!groupId || !languageId) throw new Error("Missing parameters");

  await requireGroupMember(groupId, session.user.id);

  const originals = await getVocabularyEntriesToCopy({
    groupId,
    languageId,
  });

  await prisma.userLanguage.createMany({
    data: [{ userId: session.user.id, languageId }],
    skipDuplicates: true,
  });
  await copyVocabularyToProfile(session.user.id, originals);
  await revalidateLanguage(languageId);
  revalidatePath("/app/vocabulary");
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

  await requireGroupMember(groupId, session.user.id);

  const groupLanguage = await prisma.groupLanguage.findUnique({
    where: {
      groupId_languageId: {
        groupId,
        languageId,
      },
    },
  });

  if (!groupLanguage) {
    throw new Error("Add this language to the group before sharing vocabulary for it.");
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

export async function updateGroupVocabulary(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const wordId = String(formData.get("wordId") ?? "");
  const word = String(formData.get("word") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();

  if (!groupId || !wordId || !word || !meaning) {
    throw new Error("All fields are required");
  }

  await requireGroupMember(groupId, session.user.id);

  const existingWord = await prisma.vocabularyEntry.findFirst({
    where: { id: wordId, groupId },
    select: { id: true, languageId: true },
  });

  if (!existingWord) {
    throw new Error("Vocabulary word not found.");
  }

  const duplicate = await prisma.vocabularyEntry.findFirst({
    where: {
      groupId,
      languageId: existingWord.languageId,
      id: { not: wordId },
      displayForm: {
        equals: word,
        mode: "insensitive",
      },
    },
  });

  if (duplicate) {
    throw new Error("This word is already in the group vocabulary list.");
  }

  await prisma.$transaction([
    prisma.vocabularyEntry.update({
      where: { id: wordId },
      data: {
        displayForm: word,
        definition: meaning,
      },
    }),
    prisma.vocabularyTranslation.deleteMany({
      where: { entryId: wordId },
    }),
    prisma.vocabularyTranslation.create({
      data: {
        entryId: wordId,
        text: meaning,
      },
    }),
  ]);

  revalidatePath(`/app/groups/${groupId}`);
}

export async function deleteGroupVocabulary(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const wordId = String(formData.get("wordId") ?? "");

  if (!groupId || !wordId) throw new Error("Missing parameters");

  await requireGroupMember(groupId, session.user.id);

  await prisma.vocabularyEntry.deleteMany({
    where: {
      id: wordId,
      groupId,
    },
  });

  revalidatePath(`/app/groups/${groupId}`);
}

export async function addGroupLanguage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const languageId = String(formData.get("languageId") ?? "");

  if (!groupId || !languageId) throw new Error("Missing parameters");

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("You must be a member of the group to add a language.");
  }

  const userLanguage = await prisma.userLanguage.findUnique({
    where: {
      userId_languageId: {
        userId: session.user.id,
        languageId,
      },
    },
  });

  if (!userLanguage) {
    throw new Error("Add this language on the Languages page before adding it to a group.");
  }

  await prisma.groupLanguage.createMany({
    data: [{ groupId, languageId }],
    skipDuplicates: true,
  });

  revalidatePath(`/app/groups/${groupId}`);
}

export async function updateGroupMemberRole(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!groupId || !memberId || !["ADMIN", "MEMBER"].includes(role)) {
    throw new Error("Missing parameters");
  }

  await requireGroupOwner(groupId, session.user.id);

  const member = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId },
  });

  if (!member) throw new Error("Member not found.");
  if (member.role === "OWNER" || member.userId === session.user.id) {
    throw new Error("The group owner role cannot be changed here.");
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { role: role as "ADMIN" | "MEMBER" },
  });

  revalidatePath(`/app/groups/${groupId}`);
}

export async function removeGroupMember(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  if (!groupId || !memberId) throw new Error("Missing parameters");

  await requireGroupOwner(groupId, session.user.id);

  const member = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId },
  });

  if (!member) throw new Error("Member not found.");
  if (member.role === "OWNER" || member.userId === session.user.id) {
    throw new Error("The group owner cannot be removed.");
  }

  await prisma.groupMember.delete({
    where: { id: memberId },
  });

  revalidatePath(`/app/groups/${groupId}`);
}

// Action to trigger vocabulary import manually post-join
export async function importVocabularyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = String(formData.get("groupId") ?? "");
  const importedVocabIdsStr = String(formData.get("importedVocabIds") ?? "");
  const languageId = String(formData.get("languageId") ?? "");

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

  if (languageId) {
    const groupLanguage = await prisma.groupLanguage.findUnique({
      where: {
        groupId_languageId: {
          groupId,
          languageId,
        },
      },
    });

    if (!groupLanguage) {
      throw new Error("Add this language to the group before importing vocabulary for it.");
    }
  }

  await importVocabularyToGroup(groupId, importedVocabIdsStr, languageId || undefined);
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
