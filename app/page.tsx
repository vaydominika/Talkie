import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleCheck, Clock3 } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");
  return <main className="flex min-h-svh flex-col bg-background">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b px-6 py-5">
      <span className="inline-flex items-center gap-2 font-semibold tracking-tight"><span className="size-2 rounded-full bg-accent ring-1 ring-ring/30" />Talkie</span>
      <div className="flex items-center gap-1"><ModeToggle/><Button asChild variant="ghost"><Link href="/sign-in">Sign in</Link></Button></div>
    </header>
    <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
      <div>
        <p className="section-label mb-5">A calmer way to learn</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Make language practice part of your day.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Plan a focused session, review the right words, and see the week take shape without scores, streak pressure, or noise.</p>
        <Button asChild variant="accent" size="lg" className="mt-8"><Link href="/sign-up">Start learning <ArrowRight /></Link></Button>
      </div>
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-3 border-b pb-4"><div><p className="section-label">Today</p><h2 className="mt-1 text-xl font-semibold">Your study thread</h2></div><span className="whitespace-nowrap font-mono text-sm">30 min</span></div>
        <div className="space-y-1 py-3">
          <PreviewRow icon={<CircleCheck />} title="Review due words" meta="12 cards · German" done />
          <PreviewRow icon={<Clock3 />} title="Focus on weak words" meta="15 minutes · Japanese" />
          <PreviewRow icon={<Clock3 />} title="Listen and shadow" meta="1 round · Japanese" />
        </div>
        <div className="flex items-center justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">One small session at a time.</span><span className="size-2 rounded-full bg-accent" /></div>
      </div>
    </section>
    <footer className="border-t px-6 py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Talkie</footer>
  </main>;
}

function PreviewRow({ icon, title, meta, done = false }: { icon: React.ReactNode; title: string; meta: string; done?: boolean }) {
  return <div className="flex items-center gap-3 rounded-md px-2 py-3"><span className={done ? "text-success" : "text-muted-foreground"}>{icon}</span><div><p className={done ? "text-sm font-medium line-through decoration-accent decoration-2" : "text-sm font-medium"}>{title}</p><p className="text-xs text-muted-foreground">{meta}</p></div></div>;
}
