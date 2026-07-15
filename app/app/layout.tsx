import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarLink } from "@/components/sidebar-link";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationIndicator, TimerProvider, TimerTrigger } from "@/components/timer-provider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const [user, languages] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, image: true, role: true } }),
    prisma.language.findMany({
      where: { users: { some: { userId: session.user.id } } },
      orderBy: [{ sidebarPosition: "asc" }, { name: "asc" }],
      select: { code: true, name: true, nativeName: true },
    }),
  ]);
  if (!user) redirect("/sign-in");

  async function leave() { "use server"; await signOut({ redirectTo: "/" }); }
  const displayName = user.name || user.email || session.user.email;
  const isAdmin = session.user.role === "ADMIN" || user.role === "ADMIN";

  return <TimerProvider userId={session.user.id}>
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="offcanvas" className="border-sidebar-border">
        <SidebarHeader className="h-14 justify-center border-b px-4">
          <Link className="inline-flex items-center gap-2 font-semibold tracking-tight" href="/app/dashboard">
            <span className="size-2 rounded-full bg-accent ring-1 ring-ring/30" />Talkie
          </Link>
        </SidebarHeader>
        <SidebarContent className="py-3">
          <NavGroup label="Workspace">
            <NavItem href="/app/dashboard" exact>Dashboard</NavItem>
          </NavGroup>
          <NavGroup label="Learning">
            <NavItem href="/app/languages">Languages</NavItem>
            <NavItem href="/app/groups">Groups</NavItem>
            <NavItem href="/app/friends">Friends</NavItem>
          </NavGroup>
          <NavGroup label="Progress"><NavItem href="/app/review">Stats</NavItem></NavGroup>
          {languages.length > 0 && <NavGroup label="My languages">
            {languages.map(language => <NavItem key={language.code} href={languageHref(language) as Route}>{language.name}</NavItem>)}
          </NavGroup>}
          {isAdmin && <NavGroup label="Manage"><NavItem href="/app/admin">Admin</NavItem></NavGroup>}
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="gap-1 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-2">
            <UserAvatar name={user.name} email={user.email} image={user.image} size="sm" />
            <div className="min-w-0"><p className="truncate text-sm font-medium">{displayName}</p>{user.name && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}</div>
          </div>
          <SidebarLink href="/app/settings">Settings</SidebarLink>
          <form action={leave}><Button variant="ghost" className="w-full justify-start text-muted-foreground">Sign out</Button></form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="md:hidden" />
          <Link className="font-semibold tracking-tight md:hidden" href="/app/dashboard">Talkie</Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationIndicator />
            <TimerTrigger />
            <ModeToggle />
            <span className="ml-2 hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  </TimerProvider>;
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <SidebarGroup><SidebarGroupLabel className="font-mono text-[0.65rem] uppercase tracking-[0.16em]">{label}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{children}</SidebarMenu></SidebarGroupContent></SidebarGroup>;
}

function NavItem({ href, children, exact = false }: { href: Route | string; children: React.ReactNode; exact?: boolean }) {
  return <SidebarMenuItem><SidebarLink href={href} exact={exact}>{children}</SidebarLink></SidebarMenuItem>;
}
