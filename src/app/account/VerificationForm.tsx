"use client";

import { useActionState } from "react";
import { requestVerification } from "@/app/actions/account";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function VerificationForm() {
  const [state, action] = useActionState(requestVerification, {});
  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        <span className="field-label">Link to your Facebook, Instagram or other public profile</span>
        <span className="field-hint">
          On Facebook or Instagram: open your profile, tap the ⋯ or Share profile button, then Copy link, and paste it here.
          Next, we&rsquo;ll give you a short code to put in your bio.
        </span>
        <input name="social_url" type="url" required className="input" placeholder="https://facebook.com/your.name" />
      </label>
      <label className="field">
        <span className="field-label">Philippine mobile number (optional)</span>
        <span className="field-hint">Only moderators see this. We never send messages to it.</span>
        <input name="ph_mobile" type="tel" className="input max-w-xs" placeholder="0917 123 4567" />
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-fit" pendingText="Sending...">Ask to be verified</SubmitButton>
    </form>
  );
}
