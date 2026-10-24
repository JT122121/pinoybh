"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { Captcha } from "@/components/Captcha";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action] = useActionState(logIn, linkError ? { error: "That link has expired or was already used. Log in, or ask for a new link." } : {});
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span className="field-label">Email</span>
        <input name="email" type="email" className="input" required autoComplete="email" />
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
  );
}
