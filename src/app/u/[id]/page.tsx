import Image from "next/image";
import { notFound } from "next/navigation";
import { blockMember, followMember, unfollow } from "@/app/actions/social";
import { PostList } from "@/components/PostRow";
import { ReportDialog } from "@/components/ReportDialog";
import { SubmitButton } from "@/components/SubmitButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { mediaUrl } from "@/lib/format";
import { POST_SELECT, sortPhotos } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostWithExtras, Profile } from "@/lib/types";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";

type Params = { params: Promise<{ id: string }> };

export default async function ProfilePage({ params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const viewer = await getViewer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, area, bio, avatar_path, is_verified, created_at")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (!profile) notFound();

  const [{ data: posts }, { data: follow }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("author_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(50),
    viewer ? supabase.from("follows").select("id").eq("followed_user_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const isSelf = viewer?.userId === id;
  const here = `/u/${id}`;
  const since = new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <section className="panel grid gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-2xl font-bold">
            {profile.avatar_path ? (
              <Image src={mediaUrl(profile.avatar_path)} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              profile.display_name.slice(0, 1)
            )}
          </div>
          <div>
            <h1 className="heading text-3xl">{profile.display_name}</h1>
            <p className="text-muted">
              {profile.area ? `${profile.area}. ` : ""}Member since {since}
            </p>
          </div>
        </div>
        {profile.is_verified && <VerifiedBadge size="large" />}
        {profile.bio && <p className="whitespace-pre-line">{profile.bio}</p>}
        {isSelf ? (
          <Link href="/account" className="btn btn-quiet w-fit">Edit your profile</Link>
        ) : viewer ? (
          <div className="flex flex-wrap gap-2">
            <form action={follow ? unfollow : followMember}>
              <input type="hidden" name="back" value={here} />
              <input type="hidden" name="user_id" value={id} />
              {follow && <input type="hidden" name="follow_id" value={follow.id} />}
              <SubmitButton className={`btn btn-small ${follow ? "btn-quiet" : "btn-primary"}`} pendingText="Saving...">
                {follow ? "Following" : "Follow"}
              </SubmitButton>
            </form>
            <ReportDialog profileId={id} label="Report this member" />
            <form action={blockMember}>
              <input type="hidden" name="back" value="/" />
              <input type="hidden" name="user_id" value={id} />
              <SubmitButton className="btn btn-quiet btn-small" pendingText="Blocking..." confirm={`Block ${profile.display_name}? You won't see each other's posts while logged in, and they can't follow you. You can unblock them later in My account.`}>Block</SubmitButton>
            </form>
          </div>
        ) : (
          <Link href={`/login?next=${here}`} className="btn btn-quiet btn-small w-fit">Log in to follow or report</Link>
        )}
      </section>

      <section>
        <h2 className="heading mb-3 text-2xl">Posts</h2>
        <PostList posts={((posts ?? []) as unknown as PostWithExtras[]).map(sortPhotos)} empty={<p>No live posts right now.</p>} />
      </section>
    </div>
  );
}
