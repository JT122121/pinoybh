"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteComment } from "@/app/actions/comments";
import { ReportDialog } from "@/components/ReportDialog";
import { SubmitButton } from "@/components/SubmitButton";
import { Sun } from "@/components/Sun";
import { mediaUrl, timeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { CommentForm } from "./CommentForm";

interface Viewer {
  id: string;
  isStaff: boolean;
}

export function CommentItem({
  comment,
  replies = [],
  viewer,
  postAuthorId,
  canReply,
}: {
  comment: Comment;
  replies?: Comment[];
  viewer: Viewer | null;
  postAuthorId: string;
  canReply: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "reply" | "edit">("idle");
  const isMine = viewer?.id === comment.author_id;
  const canDelete = Boolean(viewer && (isMine || viewer.isStaff || viewer.id === postAuthorId));
  const name = comment.author?.display_name ?? "Member";
  const small = comment.parent_id !== null;

  return (
    <li id={`comment-${comment.id}`} className="scroll-mt-24">
      <div className="flex gap-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface font-bold ${small ? "h-8 w-8 text-sm" : "h-10 w-10"}`}>
          {comment.author?.avatar_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(comment.author.avatar_path)} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 flex-1">
          {mode === "edit" ? (
            <CommentForm postId={comment.post_id} editId={comment.id} initialBody={comment.body} autoFocus onDone={() => setMode("idle")} />
          ) : (
            <div className="w-fit max-w-full rounded-2xl bg-surface px-3.5 py-2">
              <p className="flex flex-wrap items-center gap-x-2 text-[0.9375rem]">
                <Link href={`/u/${comment.author_id}`} className="font-bold hover:underline">{name}</Link>
                {comment.author?.is_verified && (
                  <span title="Verified Kabayan: a moderator confirmed this member is part of the community." className="inline-flex">
                    <Sun className="h-3.5 w-3.5 text-ink" title="Verified Kabayan" />
                  </span>
                )}
                {comment.author_id === postAuthorId && <span className="rounded-full bg-sun-soft px-2 text-xs font-bold">Seller</span>}
              </p>
              <p className="whitespace-pre-line break-words">{comment.body}</p>
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 text-sm text-muted">
            <span>{timeAgo(comment.created_at)}</span>
            {comment.edited_at && <span>Edited</span>}
            {comment.status === "pending_review" && <span className="font-bold text-flag">Waiting for review</span>}
            {comment.status === "hidden" && <span className="font-bold text-flag">Hidden after reports</span>}
            {canReply && comment.status === "active" && (
              <button type="button" className="font-bold hover:underline" onClick={() => setMode(mode === "reply" ? "idle" : "reply")}>Reply</button>
            )}
            {isMine && mode !== "edit" && (
              <button type="button" className="font-bold hover:underline" onClick={() => setMode("edit")}>Edit</button>
            )}
            {canDelete && (
              <form action={deleteComment} className="inline">
                <input type="hidden" name="comment_id" value={comment.id} />
                <input type="hidden" name="post_id" value={comment.post_id} />
                <SubmitButton
                  className="font-bold hover:underline"
                  pendingText="Deleting..."
                  confirm={replies.length ? "Delete this comment and its replies? This cannot be undone." : "Delete this comment? This cannot be undone."}
                >
                  Delete
                </SubmitButton>
              </form>
            )}
            {viewer && !isMine && (
              <ReportDialog commentId={comment.id} label="Report" buttonClassName="font-bold hover:underline" />
            )}
          </div>

          {(replies.length > 0 || mode === "reply") && (
            <ul className="mt-3 grid gap-3">
              {replies.map((r) => (
                <CommentItem key={r.id} comment={r} viewer={viewer} postAuthorId={postAuthorId} canReply={canReply} />
              ))}
              {mode === "reply" && (
                <li>
                  <CommentForm
                    postId={comment.post_id}
                    parentId={comment.parent_id ?? comment.id}
                    placeholder={`Reply to ${name}...`}
                    autoFocus
                    onDone={() => setMode("idle")}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
