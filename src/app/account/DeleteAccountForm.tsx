"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, {});
  return (
    <form action={action} className="grid gap-3">
      <p>This deletes your profile, all your posts and photos, and everything you follow. It cannot be undone.</p>
      <label className="field max-w-xs">
        <span className="field-label">Type DELETE to confirm</span>
        <input name="confirm" className="input" autoComplete="off" required />
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-danger w-fit" pendingText="Deleting...">Delete my account</SubmitButton>
    </form>
  );
}
