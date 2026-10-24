import Link from "next/link";
import { setPostMuted } from "@/app/actions/comments";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import type { Comment, Post } from "@/lib/types";
import type { Viewer } from "@/lib/viewer";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

export async function CommentsSection({ post, viewer }: { post: Post; viewer: Viewer | null }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, post_id, author_id, parent_id, body, status, edited_at, created_at, author:profiles!comments_author_id_fkey(id, display_name, is_verified, avatar_path)")
    .eq("post_id", post.id)
    .order("created_at")
    .limit(500);
  const comments = (data ?? []) as unknown as Comment[];
  const top = comments.filter((c) => !c.parent_id);
  const replies = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
  }
  const open = post.status === "active";
  const canReply = Boolean(viewer) && open;
  const v = viewer ? { id: viewer.userId, isStaff: viewer.isStaff } : null;

  // The mute button is for people who get notified about this post: its
  // owner and anyone who has commented on it.
  const involved = Boolean(viewer && (viewer.userId === post.author_id || comments.some((c) => c.author_id === viewer.userId)));
  let muted = false;
  if (viewer && involved) {
    const { data: mute } = await supabase.from("post_mutes").select("post_id").eq("post_id", post.id).maybeSingle();
    muted = Boolean(mute);
  }

  return (
    <section id="comments" aria-labelledby="comments-title" className="panel scroll-mt-24 p-4 sm:p-5 lg:col-start-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="comments-title" className="heading text-xl">
          {comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
        </h2>
        {involved && (
          <form action={setPostMuted}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="muted" value={muted ? "false" : "true"} />
            <SubmitButton className="btn btn-quiet btn-small" pendingText="Saving...">
              {muted ? "Turn on notifications for this post" : "Turn off notifications for this post"}
            </SubmitButton>
          </form>
        )}
      </div>

      <div className="mt-4">
        {!open ? (
          <p className="text-muted">Comments are closed on this post.</p>
        ) : viewer ? (
          <CommentForm postId={post.id} />
        ) : (
          <p>
            <Link href={`/login?next=/posts/${post.id}%23comments`} className="font-bold underline">Log in</Link> or{" "}
            <Link href="/signup" className="font-bold underline">join</Link> to comment.
          </p>
        )}
      </div>

      {top.length > 0 ? (
        <ul className="mt-6 grid gap-5">
          {top.map((c) => (
            <CommentItem key={c.id} comment={c} replies={replies.get(c.id)} viewer={v} postAuthorId={post.author_id} canReply={canReply} />
          ))}
        </ul>
      ) : (
        open && <p className="mt-4 text-muted">No comments yet. Ask the {post.kind === "job" ? "poster" : "seller"} a question.</p>
      )}
    </section>
  );
}
