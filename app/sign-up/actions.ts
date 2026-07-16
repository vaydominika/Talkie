"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError, validateUsername } from "@/lib/usernames";

export type SignUpField = "name" | "username" | "email" | "password";

export type SignUpState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<SignUpField, string>>;
  values: {
    name: string;
    username: string;
    email: string;
  };
};

export async function createAccount(_previousState: SignUpState, formData: FormData): Promise<SignUpState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    username: String(formData.get("username") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  };
  const password = String(formData.get("password") ?? "");
  const fieldErrors: SignUpState["fieldErrors"] = {};
  const usernameResult = validateUsername(values.username);

  if (!values.name) fieldErrors.name = "Enter your name.";
  else if (values.name.length > 80) fieldErrors.name = "Name must be 80 characters or fewer.";
  if (usernameResult.error) fieldErrors.username = usernameResult.error;
  if (!z.string().email().safeParse(values.email).success) fieldErrors.email = "Enter a valid email address.";
  if (password.length < 8) fieldErrors.password = "Password must be at least 8 characters.";

  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, values };

  const username = usernameResult.username!;
  const [emailOwner, usernameOwner] = await Promise.all([
    prisma.user.findFirst({ where: { email: { equals: values.email, mode: "insensitive" } }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } }, select: { id: true } }),
  ]);

  if (emailOwner) fieldErrors.email = "An account already uses this email address.";
  if (usernameOwner) fieldErrors.username = "That username is already taken.";
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, values };

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        email: values.email,
        name: values.name,
        username,
        passwordHash,
        profile: { create: {} },
        preferences: { create: {} },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "username")) {
      return { status: "error", fieldErrors: { username: "That username is already taken." }, values };
    }
    if (isUniqueConstraintError(error, "email")) {
      return { status: "error", fieldErrors: { email: "An account already uses this email address." }, values };
    }
    if (isUniqueConstraintError(error)) {
      return { status: "error", message: "That email address or username is already in use.", values };
    }
    return { status: "error", message: "The account could not be created. Try again.", values };
  }

  redirect("/sign-in");
}
