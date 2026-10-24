"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, {});
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">Permanently remove your profile, posts and photos.</p>
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)} aria-expanded={false}>
          Delete my account...
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      <p>This deletes your profile, all your posts and photos, and everything you follow. It cannot be undone.</p>
      <label className="field max-w-xs">
        <span className="field-label">Type DELETE to confirm</span>
        <input name="confirm" className="input" autoComplete="off" required autoFocus />
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn btn-danger" pendingText="Deleting...">Delete my account</SubmitButton>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
