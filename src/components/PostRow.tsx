import Image from "next/image";
import Link from "next/link";
import { formatPrice, mediaUrl, timeAgo } from "@/lib/format";
import { JOB_TYPES, STATUS_LABEL } from "@/lib/constants";
import type { PostWithExtras } from "@/lib/types";
import { VerifiedBadge } from "./VerifiedBadge";
import { Sun } from "./Sun";

export function PostRow({ post, showStatus = false }: { post: PostWithExtras; showStatus?: boolean }) {
  const photo = post.photos[0];
  const price = formatPrice(post);
  const jobLabel = post.job_type ? JOB_TYPES.find((j) => j.value === post.job_type)?.label : null;
  const comments = post.comment_count?.[0]?.count ?? 0;

  return (
    <li className="border-b border-r border-line">
      <Link href={`/posts/${post.id}`} className="flex gap-4 px-4 py-4 hover:bg-surface">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-24">
          {photo ? (
            <Image src={mediaUrl(photo.path)} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-line">
              <Sun className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {price && <p className="heading text-lg">{price}</p>}
          {jobLabel && <p className="text-sm font-bold text-ink-soft">{jobLabel}</p>}
          <h3 className="line-clamp-2 font-bold leading-snug">{post.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {post.area && <span>{post.area}</span>}
            <span>{timeAgo(post.created_at)}</span>
            {comments > 0 && <span>{comments} {comments === 1 ? "comment" : "comments"}</span>}
            {post.author?.is_verified && <VerifiedBadge />}
            {showStatus && post.status !== "active" && (
              <span className="rounded-full bg-flag-soft px-2 py-0.5 font-bold text-flag">{STATUS_LABEL[post.status]}</span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function PostList({
  posts,
  empty,
  showStatus,
  wide = false,
}: {
  posts: PostWithExtras[];
  empty: React.ReactNode;
  showStatus?: boolean;
  /** Use more columns on wide screens (browse pages). */
  wide?: boolean;
}) {
  if (posts.length === 0) return <div className="panel px-4 py-8 text-center">{empty}</div>;
  return (
    <div className="panel overflow-hidden">
      {/* Negative margins tuck each row's outer right/bottom border under the panel edge. */}
      <ul className={`-mb-px -mr-px grid ${wide ? "lg:grid-cols-2 2xl:grid-cols-3" : ""}`}>
        {posts.map((p) => (
          <PostRow key={p.id} post={p} showStatus={showStatus} />
        ))}
      </ul>
    </div>
  );
}
