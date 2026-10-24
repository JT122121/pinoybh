"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function ChangePasswordForm({ email }: { email: string | undefined }) {
  const [state, action] = useActionState(changePassword, {});
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) {
      form.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-2">
          {email && (
            <p>
              You log in with <strong>{email}</strong>.
            </p>
          )}
          {state.success && <FormMessage state={state} />}
        </div>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)} aria-expanded={false}>
          Change password
        </button>
      </div>
    );
  }

  return (
    <form ref={form} action={action} className="grid max-w-md gap-4">
      {email && (
        <p>
          You log in with <strong>{email}</strong>.
        </p>
      )}
      <label className="field">
        <span className="field-label">Current password</span>
        <input name="current" type="password" required className="input" autoComplete="current-password" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">New password</span>
        <span className="field-hint">At least 8 characters.</span>
        <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </label>
      <label className="field">
        <span className="field-label">Type the new password again</span>
        <input name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-primary" pendingText="Changing...">Change password</SubmitButton>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
        <Link href="/forgot-password" className="text-[0.9375rem] underline">Forgot your current password?</Link>
      </div>
    </form>
  );
}
