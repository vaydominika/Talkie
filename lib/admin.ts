import type { Role } from "@prisma/client";

export function getAdminEmails() {
  return [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase()));
}

export function resolveRole(email?: string | null, role?: Role | string | null): Role {
  return isAdminEmail(email) ? "ADMIN" : ((role as Role | undefined) ?? "STUDENT");
}
