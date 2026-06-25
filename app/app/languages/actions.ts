"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addLanguageToProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const languageId = String(formData.get("languageId") ?? "");
  if (!languageId) throw new Error("Language ID is required");

  // Check if already in profile
  const existing = await prisma.userLanguage.findUnique({
    where: {
      userId_languageId: {
        userId: session.user.id,
        languageId,
      },
    },
  });

  if (!existing) {
    await prisma.userLanguage.create({
      data: {
        userId: session.user.id,
        languageId,
      },
    });
  }

  revalidatePath("/app/languages");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/layout");
}

export async function removeLanguageFromProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const languageId = String(formData.get("languageId") ?? "");
  if (!languageId) throw new Error("Language ID is required");

  // Delete UserLanguage
  await prisma.userLanguage.deleteMany({
    where: {
      userId: session.user.id,
      languageId,
    },
  });

  // Delete user's private vocabulary for that language
  await prisma.vocabularyEntry.deleteMany({
    where: {
      userId: session.user.id,
      languageId,
      groupId: null,
    },
  });

  revalidatePath("/app/languages");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/layout");
}
