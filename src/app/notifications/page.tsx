import Link from "next/link";
import { markAllRead } from "@/app/actions/social";
import { SubmitButton } from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";

export const metadata = { title: "Notifications" };

const REASON: Record<string, string> = {
  followed_member: "From a member you follow",
  followed_category: "In a category you follow",
  saved_search: "Matches a search you follow",
  comment: "New comment on your post",
  reply: "Replied to your comment",
};

export default async function NotificationsPage() {
  await requireViewer("/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, reason, read_at, created_at, comment_id, post:posts(id, title, status), comment:comments(body, author:profiles!comments_author_id_fkey(display_name))")
    .order("created_at", { ascending: false })
    .limit(100);
  type Row = {
    id: string;
    reason: string;
    read_at: string | null;
    created_at: string;
    comment_id: string | null;
    post: { id: string; title: string } | null;
    comment: { body: string; author: { display_name: string } | null } | null;
  };
  // A post can disappear (deleted, hidden or blocked); RLS then returns null.
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.post && (!r.comment_id || r.comment));
  const unread = rows.some((r) => !r.read_at);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl">Notifications</h1>
        {unread && (
          <form action={markAllRead}>
            <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Mark all as read</SubmitButton>
          </form>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="panel mt-6 p-5">
          Nothing new. <Link href="/following" className="font-bold underline">Follow members, categories or searches</Link> to hear about new posts.
        </p>
      ) : (
        <ul className="panel mt-6 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className={r.read_at ? "" : "bg-sun-soft"}>
              <Link href={`/posts/${r.post!.id}${r.comment_id ? `#comment-${r.comment_id}` : ""}`} className="block px-4 py-3">
                <span className="block font-bold">{r.post!.title}</span>
                {r.comment && (
                  <span className="line-clamp-2 block">
                    {r.comment.author?.display_name ?? "A member"}: &ldquo;{r.comment.body}&rdquo;
                  </span>
                )}
                <span className="text-sm text-muted">
                  {REASON[r.reason]}, {timeAgo(r.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
