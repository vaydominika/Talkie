import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex justify-between items-center">
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Talkie
        </span>
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 text-center py-20 flex-1 flex flex-col justify-center items-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Master Languages <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Effortlessly.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
          Smart flashcards, SRS scheduling, and structured group learning designed to build long-term retention.
        </p>
        <div className="flex gap-4">
          <Button asChild className="h-12 rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/25">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Talkie. All rights reserved.
      </footer>
    </main>
  );
}
