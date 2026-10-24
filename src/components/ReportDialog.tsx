"use client";

import { useActionState, useRef, useState } from "react";
import { sendReport } from "@/app/actions/social";
import { REPORT_REASONS } from "@/lib/constants";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ReportDialog({ postId, profileId, label }: { postId?: string; profileId?: string; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(sendReport, {});
  const [reason, setReason] = useState("");
  const needsDetails = REPORT_REASONS.find((r) => r.value === reason)?.needsDetails ?? false;

  return (
    <>
      <button type="button" className="btn btn-danger btn-small" onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog ref={dialog} className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl p-0 backdrop:bg-ink/60">
        <div className="p-5">
          <h2 className="heading text-xl">{label}</h2>
          {state.success ? (
            <div className="mt-4 grid gap-4">
              <FormMessage state={state} />
              <button type="button" className="btn btn-primary" onClick={() => dialog.current?.close()}>Close</button>
            </div>
          ) : (
            <form action={action} className="mt-4 grid gap-4">
              <FormMessage state={state} />
              {postId && <input type="hidden" name="post_id" value={postId} />}
              {profileId && <input type="hidden" name="profile_id" value={profileId} />}
              <fieldset className="grid gap-2">
                <legend className="field-label mb-1">What's wrong?</legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <input type="radio" name="reason" value={r.value} required onChange={() => setReason(r.value)} className="h-5 w-5 accent-ink" />
                    {r.label}
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span className="field-label">{needsDetails ? "Tell us what happened" : "Anything else? (optional)"}</span>
                {reason === "not_community" && (
                  <span className="field-hint">Explain what they did. Please don't report someone only because of their name or how they look.</span>
                )}
                <textarea name="details" className="input" maxLength={1000} required={needsDetails} minLength={needsDetails ? 10 : undefined} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>Cancel</button>
                <SubmitButton className="btn btn-primary" pendingText="Sending...">Send report</SubmitButton>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
