"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, {});
  return (
    <AuthShell title="Reset your password">
      <form action={action} className="grid gap-4">
        <FormMessage state={state} />
        <label className="field">
          <span className="field-label">Your email</span>
          <input name="email" type="email" className="input" required autoComplete="email" />
        </label>
        <SubmitButton pendingText="Sending...">Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}
