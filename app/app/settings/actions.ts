"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfileSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const dailyMinutes = Math.max(1, Math.min(240, Number.parseInt(String(formData.get("dailyMinutes") ?? "15"), 10) || 15));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        image: image || null,
      },
    }),
    prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: { dailyMinutes },
      create: { userId: session.user.id, dailyMinutes },
    }),
  ]);

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  revalidatePath("/app");
}

export async function updateDailyMinutes(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const dailyMinutes = Math.max(1, Math.min(240, Number.parseInt(String(formData.get("dailyMinutes") ?? "15"), 10) || 15));

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: { dailyMinutes },
    create: { userId: session.user.id, dailyMinutes },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
}
