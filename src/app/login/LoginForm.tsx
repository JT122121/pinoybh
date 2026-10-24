"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { logIn, resendConfirmation } from "@/app/actions/auth";
import { Captcha } from "@/components/Captcha";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/types";

const NOTICES: Record<string, FormState> = {
  confirmed: { success: "Your email is confirmed. Log in to start using PinoyBH." },
  reset: { success: "Your password was changed. Log in with your new password." },
  link: { error: "That link has expired or was already used. Log in, or ask for a new link below." },
};

export function LoginForm({ next, notice }: { next: string; notice?: keyof typeof NOTICES }) {
  const [state, action] = useActionState(logIn, {});
  const [resendState, resend] = useActionState(resendConfirmation, {});
  const [email, setEmail] = useState("");
  const [linkProblem, setLinkProblem] = useState(notice === "link");

  // Email links that failed (expired, already used) report it after "#".
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("error_code") || hash.has("error")) setLinkProblem(true);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const shown: FormState = state.error ? state : linkProblem ? NOTICES.link : notice ? NOTICES[notice] : {};
  const offerResend = linkProblem || state.needsConfirmation;

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4">
        <FormMessage state={shown} />
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span className="field-label">Email</span>
          <input name="email" type="email" className="input" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input name="password" type="password" className="input" required autoComplete="current-password" />
        </label>
        <Captcha resetKey={state} />
        <SubmitButton pendingText="Logging in...">Log in</SubmitButton>
        <div className="flex flex-wrap justify-between gap-2 text-[0.9375rem]">
          <Link href="/forgot-password" className="underline">Forgot your password?</Link>
          <Link href="/signup" className="font-bold underline">Create an account</Link>
        </div>
      </form>

      {offerResend && (
        <form action={resend} className="grid gap-3 border-t border-line pt-5">
          <p className="font-bold">Need a new confirmation email?</p>
          <input type="hidden" name="email" value={email} />
          <FormMessage state={resendState} />
          <SubmitButton className="btn btn-quiet" pendingText="Sending..." disabled={!email}>
            {email ? `Send a new link to ${email}` : "Type your email above first"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
