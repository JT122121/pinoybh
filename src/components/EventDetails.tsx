import { setRsvp } from "@/app/actions/posts";
import { formatEventWhen, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import type { Viewer } from "@/lib/viewer";
import Link from "next/link";
import { SubmitButton } from "./SubmitButton";

/** When / where / entry, and the Going / Interested buttons. */
export async function EventDetails({ post, viewer }: { post: Post; viewer: Viewer | null }) {
  const supabase = await createClient();
  const [{ data: counts }, mine] = await Promise.all([
    supabase.rpc("event_rsvp_counts", { p_post_ids: [post.id] }),
    viewer ? supabase.from("event_rsvps").select("status").eq("post_id", post.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const c = (counts as { going: number; interested: number }[] | null)?.[0] ?? { going: 0, interested: 0 };
  const my = (mine.data as { status: "going" | "interested" } | null)?.status ?? null;
  const ended = new Date(post.event_ends_at ?? post.event_starts_at!).getTime() < Date.now();
  const cancelled = post.status === "closed";
  const open = post.status === "active" && !ended;
  const isOwner = viewer?.userId === post.author_id;

  return (
    <section aria-label="Event details" className="panel mt-5 grid max-w-4xl gap-4 p-4 sm:p-5">
      {cancelled && <p className="rounded-lg bg-flag-soft px-3 py-2 font-bold text-flag">This event was cancelled.</p>}
      {ended && !cancelled && <p className="rounded-lg bg-surface px-3 py-2 font-bold">This event has ended.</p>}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">When</dt>
          <dd className="heading text-lg">{formatEventWhen(post.event_starts_at!, post.event_ends_at)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Where</dt>
          <dd className="font-bold">
            {post.venue}
            {post.area && <span className="font-normal">, {post.area}</span>}
          </dd>
          {post.map_url && (
            <a href={post.map_url} target="_blank" rel="noreferrer nofollow" className="text-[0.9375rem] font-bold underline">Open in Google Maps</a>
          )}
        </div>
        <div>
          <dt className="text-sm text-muted">Entry</dt>
          <dd className="font-bold">{formatPrice(post)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <p className="mr-2 text-[0.9375rem]">
          <strong>{c.going}</strong> going, <strong>{c.interested}</strong> interested
        </p>
        {open && !isOwner && viewer && (
          <>
            {(["going", "interested"] as const).map((s) => (
              <form key={s} action={setRsvp}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="status" value={my === s ? "" : s} />
                <SubmitButton className={`btn btn-small ${my === s ? "btn-primary" : "btn-quiet"}`} pendingText="..." aria-pressed={my === s}>
                  {s === "going" ? (my === s ? "Going ✓" : "Going") : my === s ? "Interested ✓" : "Interested"}
                </SubmitButton>
              </form>
            ))}
          </>
        )}
        {open && !viewer && (
          <Link href={`/login?next=/posts/${post.id}`} className="btn btn-quiet btn-small">Log in to say you&rsquo;re going</Link>
        )}
      </div>
      {open && my && <p className="-mt-2 text-sm text-muted">We&rsquo;ll tell you if the time or place changes, or if it&rsquo;s cancelled. Tap again to remove.</p>}
      {open && post.price_type === "fixed" && (
        <p className="-mt-2 text-sm text-muted">Pay only at the event. Never send money in advance to &ldquo;reserve&rdquo; a slot.</p>
      )}
    </section>
  );
}
