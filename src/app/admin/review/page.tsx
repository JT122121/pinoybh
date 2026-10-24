import Link from "next/link";
import { setPostStatus } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { STATUS_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

/** Highlights the flagged words inside the post text. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-sun px-0.5">{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(id, display_name, created_at)")
    .in("status", ["pending_review", "hidden"])
    .order("created_at")
    .limit(100);
  const posts = (data ?? []) as unknown as (Post & { author: { id: string; display_name: string; created_at: string } | null })[];

  if (posts.length === 0) return <p className="panel p-5">The review queue is empty.</p>;

  return (
    <ul className="grid gap-4">
      {posts.map((p) => (
        <li key={p.id} className="panel grid gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link href={`/posts/${p.id}`} className="heading text-xl underline">{p.title}</Link>
            <span className="rounded-full bg-flag-soft px-2 py-0.5 text-sm font-bold text-flag">{STATUS_LABEL[p.status]}</span>
          </div>
          <p className="text-sm text-muted">
            By <Link href={`/u/${p.author?.id}`} className="underline">{p.author?.display_name}</Link>
            {p.author && <>, joined {timeAgo(p.author.created_at)}</>}. Posted {timeAgo(p.created_at)}.
          </p>
          {p.flagged_terms.length > 0 && (
            <p className="text-[0.9375rem]">
              Flagged for: <span className="font-bold">{p.flagged_terms.join(", ")}</span>
            </p>
          )}
          <p className="max-h-48 overflow-auto whitespace-pre-line rounded-lg bg-surface p-3">
            <Highlight text={p.description} terms={p.flagged_terms} />
          </p>
          <p className="text-[0.9375rem] text-muted">
            Ask yourself: does this charge job seekers anything, recruit from abroad, offer part-time maid work, or sell something banned?
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={setPostStatus}>
              <input type="hidden" name="post_id" value={p.id} />
              <input type="hidden" name="status" value="active" />
              <SubmitButton className="btn btn-primary btn-small" pendingText="...">Approve, put it live</SubmitButton>
            </form>
            <form action={setPostStatus} className="flex flex-wrap gap-2">
              <input type="hidden" name="post_id" value={p.id} />
              <input type="hidden" name="status" value="removed" />
              <input name="note" placeholder="Why (optional)" className="input min-h-9 py-1 text-[0.9375rem]" />
              <SubmitButton className="btn btn-danger btn-small" pendingText="...">Remove</SubmitButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
