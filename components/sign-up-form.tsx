"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAccount, type SignUpField, type SignUpState } from "@/app/sign-up/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignUpState = {
  status: "idle",
  values: { name: "", username: "", email: "" },
};

export function SignUpForm() {
  const [state, action, pending] = useActionState(createAccount, initialState);

  const error = (field: SignUpField) => state.fieldErrors?.[field];

  return (
    <form action={action} className="space-y-4">
      <FieldError id="name-error" message={error("name")}>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" defaultValue={state.values.name} required aria-invalid={Boolean(error("name"))} aria-describedby={error("name") ? "name-error" : undefined} />
      </FieldError>

      <FieldError id="username-error" message={error("username")}>
        <Label htmlFor="signup-username">Username</Label>
        <Input
          id="signup-username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          defaultValue={state.values.username}
          required
          aria-invalid={Boolean(error("username"))}
          aria-describedby={error("username") ? "username-error username-help" : "username-help"}
        />
        <p id="username-help" className="text-xs text-muted-foreground">Your unique @name for friends. Letters, numbers, and underscores only.</p>
      </FieldError>

      <FieldError id="email-error" message={error("email")}>
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" name="email" type="email" autoComplete="email" defaultValue={state.values.email} required aria-invalid={Boolean(error("email"))} aria-describedby={error("email") ? "email-error" : undefined} />
      </FieldError>

      <FieldError id="password-error" message={error("password")}>
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={Boolean(error("password"))} aria-describedby={error("password") ? "password-error" : undefined} />
      </FieldError>

      {state.message && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-sm text-muted-foreground">
        Already have one? <Link className="underline" href="/sign-in">Sign in</Link>
      </p>
    </form>
  );
}

function FieldError({ id, message, children }: { id: string; message?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {children}
      {message && <p id={id} role="alert" className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
