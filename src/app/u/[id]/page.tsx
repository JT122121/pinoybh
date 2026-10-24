import Link from "next/link";
import { notFound } from "next/navigation";
import { blockMember, followMember, unfollow } from "@/app/actions/social";
import { PostList } from "@/components/PostRow";
import { ReportDialog } from "@/components/ReportDialog";
import { SubmitButton } from "@/components/SubmitButton";
import { Sun } from "@/components/Sun";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { mediaUrl } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import { POST_SELECT, sortPhotos } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostKind, PostWithExtras, Profile } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

const TABS: { key: "all" | PostKind; label: string }[] = [
  { key: "all", label: "Posts" },
  { key: "listing", label: KIND_LABEL.listing },
  { key: "job", label: KIND_LABEL.job },
  { key: "event", label: KIND_LABEL.event },
];

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Member" };
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  return { title: data?.display_name ?? "Member" };
}

export default async function ProfilePage({ params, searchParams }: Params) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const viewer = await getViewer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, area, bio, avatar_path, is_verified, created_at")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (!profile) notFound();

  const isSelf = viewer?.userId === id;
  const [{ data: postData }, { data: follow }, { data: followerCount }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("author_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(100),
    viewer && !isSelf ? supabase.from("follows").select("id").eq("followed_user_id", id).maybeSingle() : Promise.resolve({ data: null }),
    isSelf ? supabase.rpc("my_follower_count") : Promise.resolve({ data: null }),
  ]);
  const posts = ((postData ?? []) as unknown as PostWithExtras[]).map(sortPhotos);
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as "all" | PostKind) : "all";
  const shown = tab === "all" ? posts : posts.filter((p) => p.kind === tab);
  const count = (key: "all" | PostKind) => (key === "all" ? posts.length : posts.filter((p) => p.kind === key).length);

  const here = `/u/${id}`;
  const since = new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const name = profile.display_name;

  return (
    <div className="pb-8">
      {/* Cover and header, Facebook-style */}
      <section className="bg-paper shadow-sm">
        <div className="mx-auto max-w-6xl lg:px-8">
          <div className="relative h-40 overflow-hidden bg-ink sm:h-64 lg:rounded-b-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink-soft to-ink" />
            <Sun className="absolute -right-16 -top-24 h-80 w-80 text-sun opacity-90 sm:-right-10 sm:h-[26rem] sm:w-[26rem]" />
          </div>

          <div className="px-4 lg:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative z-10 -mt-16 shrink-0 sm:-mt-20">
                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border-4 border-paper bg-sun text-5xl font-bold text-ink sm:h-40 sm:w-40">
                  {profile.avatar_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(profile.avatar_path)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    name.slice(0, 1).toUpperCase()
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 sm:pb-3">
                <h1 className="heading flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl sm:text-4xl">
                  <span className="break-words">{name}</span>
                  {profile.is_verified && <VerifiedBadge />}
                </h1>
                <p className="mt-1 flex flex-wrap gap-x-4 text-muted">
                  {profile.area && <span>Lives in {profile.area}</span>}
                  <span>Joined {since}</span>
                  {isSelf && followerCount != null && (
                    <span>
                      {followerCount} {followerCount === 1 ? "follower" : "followers"}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:pb-3">
                {isSelf ? (
                  <>
                    <Link href="/posts/new" className="btn btn-primary">Add a post</Link>
                    <Link href="/account" className="btn btn-quiet">Edit profile</Link>
                  </>
                ) : viewer ? (
                  <>
                    <form action={follow ? unfollow : followMember}>
                      <input type="hidden" name="back" value={here} />
                      <input type="hidden" name="user_id" value={id} />
                      {follow && <input type="hidden" name="follow_id" value={follow.id} />}
                      <SubmitButton className={`btn ${follow ? "btn-quiet" : "btn-primary"}`} pendingText="Saving...">
                        {follow ? "Following" : "Follow"}
                      </SubmitButton>
                    </form>
                    <details className="relative">
                      <summary className="btn btn-quiet list-none px-4 [&::-webkit-details-marker]:hidden" aria-label="More options">
                        <span aria-hidden className="text-xl leading-none">&middot;&middot;&middot;</span>
                      </summary>
                      <div className="absolute right-0 z-30 mt-2 grid w-56 gap-1 rounded-2xl border border-line bg-paper p-2 shadow-xl">
                        <ReportDialog profileId={id} label="Report this member" buttonClassName="rounded-lg px-3 py-2.5 text-left font-bold text-flag hover:bg-surface" />
                        <form action={blockMember}>
                          <input type="hidden" name="back" value="/" />
                          <input type="hidden" name="user_id" value={id} />
                          <SubmitButton
                            className="w-full rounded-lg px-3 py-2.5 text-left font-bold hover:bg-surface"
                            pendingText="Blocking..."
                            confirm={`Block ${name}? You won't see each other's posts while logged in, and they can't follow you. You can unblock them later in My account.`}
                          >
                            Block {name}
                          </SubmitButton>
                        </form>
                      </div>
                    </details>
                  </>
                ) : (
                  <Link href={`/login?next=${here}`} className="btn btn-primary">Log in to follow</Link>
                )}
              </div>
            </div>

            <nav aria-label="Profile sections" className="mt-4 flex gap-1 overflow-x-auto border-t border-line">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <Link
                    key={t.key}
                    href={t.key === "all" ? here : `${here}?tab=${t.key}`}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={`-mb-px whitespace-nowrap border-b-4 px-4 py-3 font-bold ${
                      active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {t.label} <span className="font-normal">{count(t.key)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 lg:grid-cols-[22rem_1fr] lg:px-8">
        <aside className="grid content-start gap-4">
          <section className="panel p-5" aria-labelledby="intro">
            <h2 id="intro" className="heading text-xl">Intro</h2>
            {profile.bio ? (
              <p className="mt-3 whitespace-pre-line text-center">{profile.bio}</p>
            ) : isSelf ? (
              <Link href="/account" className="btn btn-quiet mt-3 w-full">Add a short bio</Link>
            ) : null}
            <ul className="mt-4 grid gap-2.5">
              {profile.area && <li>Lives in <strong>{profile.area}</strong></li>}
              <li>Joined <strong>{since}</strong></li>
              <li>{posts.length} live {posts.length === 1 ? "post" : "posts"}</li>
            </ul>
            {profile.is_verified && (
              <div className="mt-4">
                <VerifiedBadge size="large" />
              </div>
            )}
            {isSelf && !profile.is_verified && (
              <Link href="/account" className="mt-4 block text-[0.9375rem] font-bold underline">Get the Verified Kabayan badge</Link>
            )}
          </section>
        </aside>

        <section aria-label={`${name}'s posts`}>
          <PostList
            posts={shown}
            wide
            empty={
              isSelf ? (
                <p>
                  Nothing here yet. <Link href={`/posts/new${tab !== "all" ? `?kind=${tab}` : ""}`} className="font-bold underline">Add a post</Link>.
                </p>
              ) : (
                <p>{name} has no live {tab === "all" ? "posts" : KIND_LABEL[tab].toLowerCase()} right now.</p>
              )
            }
          />
        </section>
      </div>
    </div>
  );
}
