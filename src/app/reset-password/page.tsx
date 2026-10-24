"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "expired" | "no-link";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, {});
  const [stage, setStage] = useState<Stage>("checking");

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Remove the one-time tokens from the address bar straight away.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);

    if (hash.has("error_code") || hash.has("error")) {
      setStage("expired");
      return;
    }
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (access && refresh) {
      supabase.auth.setSession({ access_token: access, refresh_token: refresh }).then(({ error }) => setStage(error ? "expired" : "ready"));
      return;
    }
    // Came from the /auth/confirm link, which already logged them in.
    supabase.auth.getSession().then(({ data }) => setStage(data.session ? "ready" : "no-link"));
  }, []);

  return (
    <AuthShell title="Choose a new password">
      {stage === "checking" && <p>Checking your link...</p>}
      {stage === "expired" && (
        <div className="grid gap-3">
          <p role="alert" className="rounded-lg bg-flag-soft px-3 py-2 font-bold text-flag">
            This reset link has expired or was already used.
          </p>
          <p>Reset links work once and expire after an hour.</p>
          <Link href="/forgot-password" className="btn btn-primary">Send me a new link</Link>
        </div>
      )}
      {stage === "no-link" && (
        <div className="grid gap-3">
          <p>Open the link in the reset email we sent you. It works on any phone or computer.</p>
          <Link href="/forgot-password" className="btn btn-primary">Send me a reset link</Link>
        </div>
      )}
      {stage === "ready" && (
        <form action={action} className="grid gap-4">
          <FormMessage state={state} />
          <label className="field">
            <span className="field-label">New password</span>
            <span className="field-hint">At least 8 characters.</span>
            <input name="password" type="password" className="input" required minLength={8} autoComplete="new-password" autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Type it again</span>
            <input name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
          </label>
          <SubmitButton pendingText="Saving...">Save new password</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
