"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment, editComment } from "@/app/actions/comments";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

/** New comment, reply, or edit of an existing comment. */
export function CommentForm({
  postId,
  parentId,
  editId,
  initialBody,
  placeholder = "Write a comment...",
  autoFocus,
  onDone,
}: {
  postId: string;
  parentId?: string;
  editId?: string;
  initialBody?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(editId ? editComment : addComment, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    if (!editId) form.current?.reset();
    // Keep the "waiting for review" note visible; close the box for plain success.
    if (state.success === "Posted." || state.success === "Saved.") onDone?.();
  }, [state, editId, onDone]);

  return (
    <form ref={form} action={action} className="grid gap-2">
      <input type="hidden" name="post_id" value={postId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      {editId && <input type="hidden" name="comment_id" value={editId} />}
      <label className="sr-only" htmlFor={`c-${editId ?? parentId ?? postId}`}>{placeholder}</label>
      <textarea
        id={`c-${editId ?? parentId ?? postId}`}
        name="body"
        required
        maxLength={1000}
        rows={2}
        defaultValue={initialBody}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input !min-h-0 rounded-2xl"
      />
      {state.error && <FormMessage state={state} />}
      {state.success && state.success !== "Posted." && state.success !== "Saved." && <FormMessage state={state} />}
      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary btn-small" pendingText="Posting...">
          {editId ? "Save" : parentId ? "Reply" : "Comment"}
        </SubmitButton>
        {onDone && (
          <button type="button" className="btn btn-quiet btn-small" onClick={onDone}>Cancel</button>
        )}
        {!editId && <span className="text-sm text-muted">No phone numbers or links. Use the Contact button.</span>}
      </div>
    </form>
  );
}
