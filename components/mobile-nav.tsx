"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  function closeOnNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) setOpen(false);
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon" aria-label="Open navigation"><Menu /></Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-[18rem] p-0">
      <SheetHeader className="border-b p-5 text-left">
        <SheetTitle>Talkie</SheetTitle>
        <SheetDescription>Your learning workspace</SheetDescription>
      </SheetHeader>
      <div className="max-h-[calc(100svh-5rem)] overflow-y-auto p-4" onClick={closeOnNavigation}>{children}</div>
    </SheetContent>
  </Sheet>;
}
