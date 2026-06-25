import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";

const links = [
  ["Dashboard", "/app/dashboard"],
  ["Review", "/app/review"],
  ["Groups", "/app/groups"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const languages = await prisma.language.findMany({
    where: { sidebarVisible: true },
    orderBy: [{ sidebarPosition: "asc" }, { name: "asc" }],
    select: { code: true, name: true, nativeName: true },
  });

  async function leave() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[14rem_1fr]">
      <aside className="hidden border-r p-4 md:block">
        <Link className="font-semibold" href="/app/dashboard">
          Talkie
        </Link>
        <nav className="mt-8 space-y-1">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
              {label}
            </Link>
          ))}
          {languages.length > 0 && (
            <div className="pt-4">
              <p className="px-3 pb-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Languages
              </p>
              {languages.map((language) => (
                <Link
                  key={language.code}
                  href={languageHref(language) as Route}
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  {language.name}
                </Link>
              ))}
            </div>
          )}
          {session.user.role === "ADMIN" && (
            <Link href="/app/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
              Admin
            </Link>
          )}
        </nav>
      </aside>
      <div>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <Link className="font-semibold md:hidden" href="/app/dashboard">
            Talkie
          </Link>
          <span className="text-sm text-muted-foreground">{session.user.name ?? session.user.email}</span>
          <form action={leave}>
            <Button variant="outline">Sign out</Button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
