"use client";

import { ReactNode, useRef, useState } from "react";
import { AppModal } from "@/components/app-modal";
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
        <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
          {children}
        </button>
      </form>
      {open && (
        <AppModal title={title} description={description} onClose={() => setOpen(false)}>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                setOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AppModal>
      )}
    </>
  );
}
