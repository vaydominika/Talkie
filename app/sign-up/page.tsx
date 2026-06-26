import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function SignUpPage() {
  async function submit(formData: FormData) {
    "use server";
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(80),
      })
      .safeParse(Object.fromEntries(formData));

    if (!input.success) return;

    const exists = await prisma.user.findUnique({ where: { email: input.data.email } });
    if (exists) return;

    const passwordHash = await bcrypt.hash(input.data.password, 12);
    await prisma.user.create({
      data: {
        email: input.data.email,
        name: input.data.name,
        passwordHash,
        profile: { create: {} },
        preferences: { create: {} },
      },
    });
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <form action={submit} className="w-full space-y-4 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <label className="block text-sm">
          Name
          <input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3" name="name" required />
        </label>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 flex h-10 w-full rounded-md border bg-background px-3"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 flex h-10 w-full rounded-md border bg-background px-3"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        <Button className="w-full">Create account</Button>
        <p className="text-sm text-muted-foreground">
          Already have one?{" "}
          <Link className="underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
