import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { SignUpForm } from "@/components/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-md items-center px-6 py-12"><div className="absolute right-6 top-6"><ModeToggle/></div>
      <Card className="w-full"><CardHeader><CardTitle className="text-2xl">Create an account</CardTitle><CardDescription>Start with one focused learning plan.</CardDescription></CardHeader><CardContent>
      <SignUpForm />
      </CardContent></Card>
    </main>
  );
}
