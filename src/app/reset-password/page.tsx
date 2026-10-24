"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, {});
  return (
    <AuthShell title="Choose a new password">
      <form action={action} className="grid gap-4">
        <FormMessage state={state} />
        <label className="field">
          <span className="field-label">New password</span>
          <span className="field-hint">At least 8 characters.</span>
          <input name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </label>
        <SubmitButton pendingText="Saving...">Save new password</SubmitButton>
      </form>
    </AuthShell>
  );
}
