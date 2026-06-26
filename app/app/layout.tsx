import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { SidebarLink } from "@/components/sidebar-link";
import { UserAvatar } from "@/components/user-avatar";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const [user, languages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, role: true },
    }),
    prisma.language.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      orderBy: [{ sidebarPosition: "asc" }, { name: "asc" }],
      select: { code: true, name: true, nativeName: true },
    }),
  ]);

  async function leave() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const displayName = user?.name || user?.email || session.user.email;

  return (
    <div className="min-h-screen md:pl-56">
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-56 flex-col border-r bg-background p-4 md:flex">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <Link className="font-semibold" href="/app/dashboard">
            Talkie
          </Link>
          <nav className="mt-8 space-y-6">
            <div className="space-y-1">
              <SidebarLink href="/app/dashboard" exact>
                Dashboard
              </SidebarLink>
            </div>
            <div className="space-y-1">
              <p className="px-3 pb-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Learning
              </p>
              <SidebarLink href="/app/languages">
                Languages
              </SidebarLink>
              <SidebarLink href="/app/groups">
                Groups
              </SidebarLink>
            </div>
            <div className="space-y-1">
              <p className="px-3 pb-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Progress
              </p>
              <SidebarLink href="/app/review">
                Stats
              </SidebarLink>
            </div>
          {languages.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 pb-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                My Languages
              </p>
              {languages.map((language) => (
                <SidebarLink
                  key={language.code}
                  href={languageHref(language) as Route}
                >
                  {language.name}
                </SidebarLink>
              ))}
            </div>
          )}
          {user?.role === "ADMIN" && (
            <SidebarLink href="/app/admin">
              Admin
            </SidebarLink>
          )}
        </nav>
        </div>
        <div className="shrink-0 border-t pt-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <UserAvatar name={user?.name} email={user?.email} image={user?.image} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {user?.name && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          <SidebarLink href="/app/settings">
            Settings
          </SidebarLink>
          <form action={leave} className="mt-1">
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <Link className="font-semibold md:hidden" href="/app/dashboard">
            Talkie
          </Link>
          <span className="ml-auto text-sm text-muted-foreground">{displayName}</span>
        </header>
        <main className="animate-page-in mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
