import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blockMember, followMember, unfollow } from "@/app/actions/social";
import { closePost, deletePost, reopenPost } from "@/app/actions/posts";
import { ReportDialog } from "@/components/ReportDialog";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { EventDetails } from "@/components/EventDetails";
import { SubmitButton } from "@/components/SubmitButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CONTACT_METHODS, JOB_TYPES, STATUS_LABEL } from "@/lib/constants";
import { formatEventWhen, formatPrice, mediaUrl, timeAgo, whatsappLink } from "@/lib/format";
import { configuredSiteUrl } from "@/lib/site";
import { ShareButtons } from "@/components/ShareButtons";
import type { Metadata } from "next";
import { KIND_LABEL, KIND_PATH } from "@/lib/kinds";
import { POST_SELECT, sortPhotos } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { ContactMethod, PostWithExtras } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

type Params = { params: Promise<{ id: string }> };

async function loadPost(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  return data ? sortPhotos(data as unknown as PostWithExtras) : null;
}

/** Title, text and picture shown when the post is shared on Facebook, WhatsApp and others. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await loadPost((await params).id);
  if (!post || post.status !== "active") return { title: post?.title ?? "Post not found", robots: { index: false } };
  const jobType = JOB_TYPES.find((j) => j.value === post.job_type)?.label;
  const lead =
    post.kind === "event" && post.event_starts_at
      ? [formatEventWhen(post.event_starts_at, post.event_ends_at), post.venue, formatPrice(post)]
      : [formatPrice(post) ?? jobType, post.area];
  const description = [lead.filter(Boolean).join(" | "), post.description.replace(/\s+/g, " ").slice(0, 160)].filter(Boolean).join(". ");
  const photo = post.photos[0] ? mediaUrl(post.photos[0].path) : null;
  const url = `/posts/${post.id}`;
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "PinoyBH",
      title: post.title,
      description,
      url,
      images: photo ? [{ url: photo, alt: post.title }] : [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PinoyBH" }],
    },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const [post, viewer] = await Promise.all([loadPost(id), getViewer()]);
  if (!post) notFound();

  const supabase = await createClient();
  const isOwner = viewer?.userId === post.author_id;
  const here = `/posts/${post.id}`;

  type Contact = { method: ContactMethod; value: string };
  let contact: Contact | null = null;
  let followId: string | null = null;
  const { data: cat } = await supabase.from("categories").select("name").eq("slug", post.category).single();
  const category: string | null = cat?.name ?? null;
  if (viewer) {
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("post_contacts").select("method, value").eq("post_id", post.id).maybeSingle(),
      supabase.from("follows").select("id").eq("followed_user_id", post.author_id).maybeSingle(),
    ]);
    contact = c as Contact | null;
    followId = f?.id ?? null;
  }

  const price = formatPrice(post);
  const jobType = JOB_TYPES.find((j) => j.value === post.job_type);

  return (
    <article className="mx-auto grid max-w-7xl gap-8 px-4 lg:px-8 py-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <p className="text-[0.9375rem] text-muted">
          <Link href={KIND_PATH[post.kind]} className="underline">
            {KIND_LABEL[post.kind]}
          </Link>
          {category && (
            <>
              {" / "}
              <Link href={`${KIND_PATH[post.kind]}?category=${post.category}`} className="underline">{category}</Link>
            </>
          )}
        </p>

        {post.status !== "active" && (
          <p className="mt-3 rounded-lg bg-flag-soft px-3 py-2 font-bold text-flag">
            {STATUS_LABEL[post.status]}.{" "}
            {post.status === "pending_review" && "Only you and the moderators can see this post until it's approved."}
            {post.status === "hidden" && "Members reported this post. A moderator will check it."}
            {post.status === "closed" && (post.kind === "event" ? "This event was cancelled." : "This post is closed and no longer shown in search.")}
          </p>
        )}

        <h1 className="heading mt-3 text-3xl sm:text-4xl">{post.title}</h1>
        {price && post.kind !== "event" && <p className="display mt-3 text-3xl">{price}</p>}
        {post.kind === "event" && post.event_starts_at && <EventDetails post={post} viewer={viewer} />}
        {jobType && <p className="mt-2 text-lg font-bold text-ink-soft">{jobType.label}</p>}
        <p className="mt-2 flex flex-wrap gap-x-4 text-muted">
          {post.area && <span>{post.area}</span>}
          <span>Posted {timeAgo(post.created_at)}</span>
        </p>

        {post.photos.length > 0 && (
          <div className="mt-6 grid max-w-4xl gap-2 sm:grid-cols-2">
            {post.photos.map((photo, i) => (
              <a key={photo.path} href={mediaUrl(photo.path)} target="_blank" rel="noreferrer" className={`relative block overflow-hidden rounded-xl bg-paper ${i === 0 ? "aspect-[4/3] sm:col-span-2" : "aspect-square"}`}>
                <Image src={mediaUrl(photo.path)} alt={`Photo ${i + 1} of ${post.photos.length}`} fill sizes="(min-width: 1024px) 40rem, 100vw" className="object-cover" priority={i === 0} />
              </a>
            ))}
          </div>
        )}

        <div className="mt-6 max-w-[70ch] whitespace-pre-line break-words text-lg leading-relaxed">{post.description}</div>

        {post.reference_url && (
          <p className="mt-4">
            Official job listing:{" "}
            <a href={post.reference_url} target="_blank" rel="noreferrer nofollow ugc" className="font-bold underline break-all">{post.reference_url}</a>
          </p>
        )}
      </div>

      <aside className="grid content-start gap-4 lg:row-span-2">
        <section className="panel p-4" aria-label="Contact">
          {isOwner ? (
            <div className="grid gap-2">
              <p className="font-bold">This is your post.</p>
              <Link href={`${here}/edit`} className="btn btn-primary">{post.kind === "event" ? "Edit event" : "Edit post"}</Link>
              {post.status === "active" && post.kind === "event" && (
                <form action={closePost}>
                  <input type="hidden" name="id" value={post.id} />
                  <SubmitButton
                    className="btn btn-quiet w-full"
                    pendingText="Cancelling..."
                    confirm="Cancel this event? Everyone who said Going or Interested will be told. A cancelled event can't be re-opened."
                  >
                    Cancel event
                  </SubmitButton>
                </form>
              )}
              {post.status === "active" && post.kind !== "event" && (
                <form action={closePost}>
                  <input type="hidden" name="id" value={post.id} />
                  <SubmitButton className="btn btn-quiet w-full" pendingText="Closing...">Close post (sold or filled)</SubmitButton>
                </form>
              )}
              {post.status === "closed" && post.kind !== "event" && (
                <form action={reopenPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <SubmitButton className="btn btn-quiet w-full" pendingText="Opening...">Open post again</SubmitButton>
                </form>
              )}
              <form action={deletePost}>
                <input type="hidden" name="id" value={post.id} />
                <SubmitButton className="btn btn-danger w-full" pendingText="Deleting..." confirm="Delete this post and its photos? This cannot be undone. If it's sold or filled, use Close post instead.">Delete post</SubmitButton>
              </form>
            </div>
          ) : contact ? (
            <div className="grid gap-2">
              <p className="font-bold">Contact {post.author?.display_name}</p>
              {contact.method === "whatsapp" && (
                <a href={whatsappLink(contact.value)} target="_blank" rel="noreferrer" className="btn btn-primary">WhatsApp {contact.value}</a>
              )}
              {contact.method === "phone" && <a href={`tel:${contact.value}`} className="btn btn-primary">Call {contact.value}</a>}
              {contact.method === "email" && <a href={`mailto:${contact.value}`} className="btn btn-primary break-all">Email {contact.value}</a>}
              <p className="text-sm text-muted">
                {CONTACT_METHODS.find((m) => m.value === contact.method)?.label}. Never send money before you see the item or meet the employer.
              </p>
            </div>
          ) : viewer ? (
            <p className="text-muted">No contact details on this post.</p>
          ) : (
            <div className="grid gap-2">
              <p className="font-bold">Want to contact this kabayan?</p>
              <p className="text-[0.9375rem] text-muted">Contact details are only shown to members, to keep numbers safe from spammers.</p>
              <Link href={`/login?next=${here}`} className="btn btn-primary">Log in to contact</Link>
              <Link href="/signup" className="btn btn-quiet">Join for free</Link>
            </div>
          )}
        </section>

        {post.author && (
          <section className="panel grid gap-3 p-4" aria-label="Posted by">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface">
                {post.author.avatar_path ? (
                  <Image src={mediaUrl(post.author.avatar_path)} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center font-bold">{post.author.display_name.slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/u/${post.author.id}`} className="font-bold underline">{post.author.display_name}</Link>
                {post.author.area && <p className="text-sm text-muted">{post.author.area}</p>}
              </div>
            </div>
            {post.author.is_verified && <VerifiedBadge size="large" />}
            {viewer && !isOwner && (
              <form action={followId ? unfollow : followMember}>
                <input type="hidden" name="back" value={here} />
                <input type="hidden" name="user_id" value={post.author.id} />
                {followId && <input type="hidden" name="follow_id" value={followId} />}
                <SubmitButton className="btn btn-quiet w-full" pendingText="Saving...">
                  {followId ? "Following" : `Follow ${post.author.display_name}`}
                </SubmitButton>
              </form>
            )}
          </section>
        )}

        {post.status === "active" && (
          <section className="panel grid gap-3 p-4" aria-label="Share">
            <p className="font-bold">{isOwner ? "Share your post" : "Share with a kabayan"}</p>
            <ShareButtons url={`${configuredSiteUrl() ?? ""}/posts/${post.id}`} title={post.title} />
          </section>
        )}

        {!isOwner && (
          <div className="flex flex-wrap gap-2">
            {viewer ? (
              <>
                <ReportDialog postId={post.id} label="Report this post" />
                <form action={blockMember}>
                  <input type="hidden" name="back" value={KIND_PATH[post.kind]} />
                  <input type="hidden" name="user_id" value={post.author_id} />
                  <SubmitButton className="btn btn-quiet btn-small" pendingText="Blocking..." confirm={`Block ${post.author?.display_name ?? "this member"}? You won't see each other's posts while logged in, and they can't follow you. You can unblock them later in My account.`}>Block member</SubmitButton>
                </form>
              </>
            ) : (
              <Link href={`/login?next=${here}`} className="btn btn-danger btn-small">Report this post</Link>
            )}
          </div>
        )}
      </aside>

      {/* After the sidebar in the page order, so phones show Contact first; on desktop it sits under the post. */}
      <CommentsSection post={post} viewer={viewer} />
    </article>
  );
}
