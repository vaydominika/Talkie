export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export type UsernameValidation =
  | { username: string; error?: never }
  | { username?: never; error: string };

export function validateUsername(value: unknown): UsernameValidation {
  const username = String(value ?? "").trim().toLowerCase();

  if (!username) return { error: "Choose a username." };
  if (username.length < USERNAME_MIN_LENGTH) return { error: "Username must be at least 3 characters." };
  if (username.length > USERNAME_MAX_LENGTH) return { error: "Username must be 24 characters or fewer." };
  if (!/^[a-z0-9_]+$/.test(username)) return { error: "Use only letters, numbers, and underscores." };

  return { username };
}

export function isUniqueConstraintError(error: unknown, field?: string) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;
  if (!field) return true;

  const target = "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta
    ? error.meta.target
    : undefined;

  if (Array.isArray(target)) return target.some(item => String(item).toLowerCase().includes(field.toLowerCase()));
  return typeof target === "string" && target.toLowerCase().includes(field.toLowerCase());
}
