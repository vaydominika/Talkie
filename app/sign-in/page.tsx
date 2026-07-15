import Link from "next/link";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";

export default async function SignInPage() {
  async function submit(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard",
    });
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/app/dashboard" });
  }

  return (
    <main className="relative mx-auto flex min-h-svh max-w-md items-center px-6 py-12"><div className="absolute right-6 top-6"><ModeToggle/></div>
      <Card className="w-full">
        <CardHeader><CardTitle className="text-2xl">Welcome back</CardTitle><CardDescription>Continue your study thread.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
        <form action={signInWithGoogle}>
          <Button className="w-full" variant="outline">
            Continue with Google
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" />or<Separator className="flex-1" /></div>
        <form action={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            /></div>
          <Button className="w-full">Sign in</Button>
        </form>
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link className="underline" href="/sign-up">
            Create an account
          </Link>
        </p>
        </CardContent>
      </Card>
    </main>
  );
}
