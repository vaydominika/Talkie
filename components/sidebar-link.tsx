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
        "relative block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        active &&
          "bg-rose-50/70 pl-4 font-semibold text-stone-950 shadow-[inset_3px_0_0_theme(colors.rose.600)] dark:bg-rose-950/20 dark:text-stone-50 dark:shadow-[inset_3px_0_0_theme(colors.rose.300)]",
      )}
    >
      {children}
    </Link>
  );
}
