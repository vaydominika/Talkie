"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AppModal({ title, description, children, onClose, maxWidth = "sm:max-w-md" }: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  const returnFocusRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{returnFocusRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;return()=>returnFocusRef.current?.focus()},[]);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={cn("max-h-[88vh] overflow-y-auto", maxWidth)}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}
