"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { AREAS, COMMUNITY_CHECKBOX } from "@/lib/constants";

export function SignupForm() {
  const [state, action] = useActionState(signUp, {});
  if (state.success) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <label className="field">
        <span className="field-label">Your name</span>
        <span className="field-hint">This is shown on your posts. A first name is fine.</span>
        <input name="display_name" className="input" required minLength={2} maxLength={40} autoComplete="given-name" />
      </label>
      <label className="field">
        <span className="field-label">Email</span>
        <input name="email" type="email" className="input" required autoComplete="email" />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <span className="field-hint">At least 8 characters.</span>
        <input name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        <span className="field-label">Where in Bahrain do you live? (optional)</span>
        <select name="area" className="input" defaultValue="">
          <option value="">Choose an area</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-3 rounded-xl bg-sun-soft p-3">
        <input name="rules_agreed" type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-ink" />
        <span>
          {COMMUNITY_CHECKBOX}{" "}
          <Link href="/rules" target="_blank" className="font-bold underline">Read the rules</Link>
        </span>
      </label>
      <SubmitButton pendingText="Creating your account...">Create my account</SubmitButton>
      <p className="text-center text-[0.9375rem]">
        Already a member? <Link href="/login" className="font-bold underline">Log in</Link>
      </p>
    </form>
  );
}
