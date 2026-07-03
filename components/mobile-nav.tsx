"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export function MobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  function closeOnNavigation(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("a[href]")) {
      detailsRef.current?.removeAttribute("open");
    }
  }

  return (
    <details ref={detailsRef} className="group">
      <summary className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground transition hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Menu className="h-5 w-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </summary>
      <div className="fixed inset-x-0 top-14 z-[110] border-b bg-background shadow-2xl" onClick={closeOnNavigation}>
        <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4">{children}</div>
      </div>
    </details>
  );
}
