"use client";

import { ReactNode, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Action = (formData: FormData) => void | Promise<void>;

export function ConfirmActionForm({
  action,
  fields,
  title,
  description,
  confirmLabel,
  children,
  className,
  buttonClassName,
}: {
  action: Action;
  fields: Record<string, string>;
  title: string;
  description: string;
  confirmLabel: string;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className={className}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="button" variant="ghost" onClick={() => setOpen(true)} className={buttonClassName}>
          {children}
        </Button>
      </form>
      <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" onClick={() => {setOpen(false);formRef.current?.requestSubmit()}}>{confirmLabel}</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
