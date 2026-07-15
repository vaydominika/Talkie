"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

export function SidebarLink({
  href,
  children,
  exact = false,
}: {
  href: Route | string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const hrefString = String(href);
  const active = exact ? pathname === hrefString : pathname === hrefString || pathname.startsWith(`${hrefString}/`);

  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md border border-transparent px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
        active &&
          "border-sidebar-border bg-transparent font-semibold text-sidebar-foreground hover:bg-transparent",
      )}
    >
      {children}
    </Link>
  );
}
