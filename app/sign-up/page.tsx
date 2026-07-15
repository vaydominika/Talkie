import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { ModeToggle } from "@/components/mode-toggle";

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
    <main className="relative mx-auto flex min-h-svh max-w-md items-center px-6 py-12"><div className="absolute right-6 top-6"><ModeToggle/></div>
      <Card className="w-full"><CardHeader><CardTitle className="text-2xl">Create an account</CardTitle><CardDescription>Start with one focused learning plan.</CardDescription></CardHeader><CardContent>
      <form action={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
        <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email"
            name="email"
            type="email"
            required
          /></div>
        <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password"
            name="password"
            type="password"
            minLength={8}
            required
          /></div>
        <Button className="w-full">Create account</Button>
        <p className="text-sm text-muted-foreground">
          Already have one?{" "}
          <Link className="underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </form></CardContent></Card>
    </main>
  );
}
