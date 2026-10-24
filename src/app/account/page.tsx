import Link from "next/link";
import { unblockMember } from "@/app/actions/social";
import { PostList } from "@/components/PostRow";
import { SubmitButton } from "@/components/SubmitButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { POST_SELECT, sortPhotos } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostWithExtras } from "@/lib/types";
import { requireViewer } from "@/lib/viewer";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { ProfileForm } from "./ProfileForm";
import { VerificationForm } from "./VerificationForm";
import { VerificationSteps } from "./VerificationSteps";

export const metadata = { title: "My account" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="heading text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const viewer = await requireViewer("/account");
  const supabase = await createClient();
  const [{ data: posts }, { data: requests }, { data: blocks }, { data: followers }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("author_id", viewer.userId).order("created_at", { ascending: false }),
    supabase.from("verification_requests").select("status, code, social_url, admin_note, created_at").eq("user_id", viewer.userId).order("created_at", { ascending: false }).limit(1),
    supabase.from("blocks").select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(display_name)").eq("blocker_id", viewer.userId),
    supabase.rpc("my_follower_count"),
  ]);
  const latest = requests?.[0];
  const myPosts = ((posts ?? []) as unknown as PostWithExtras[]).map(sortPhotos);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Hi, {viewer.profile.display_name}</h1>
          <p className="mt-2 text-muted">
            {followers ?? 0} {followers === 1 ? "member follows" : "members follow"} you.{" "}
            <Link href={`/u/${viewer.userId}`} className="underline">See your public profile</Link>
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-quiet btn-small">Log out</button>
        </form>
      </div>

      <Section title="Your posts">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/posts/new?kind=listing" className="btn btn-primary btn-small">Sell something</Link>
          <Link href="/posts/new?kind=job" className="btn btn-quiet btn-small">Post a job</Link>
          <Link href="/following" className="btn btn-quiet btn-small">What I follow</Link>
        </div>
        <PostList posts={myPosts} showStatus empty={<p>You haven't posted anything yet.</p>} />
      </Section>

      <Section title="Profile">
        <ProfileForm profile={viewer.profile} />
      </Section>

      <Section title="Password">
        <ChangePasswordForm email={viewer.email} />
      </Section>

      <Section title="Verified Kabayan">
        {viewer.profile.is_verified ? (
          <VerifiedBadge size="large" />
        ) : latest?.status === "pending" ? (
          <VerificationSteps code={latest.code} socialUrl={latest.social_url} />
        ) : (
          <div className="grid gap-4">
            <p>
              The badge shows other members that a moderator confirmed you're part of the community. It doesn't mean
              "trusted seller". We never ask for your passport, CPR or any ID.
            </p>
            {latest?.status === "rejected" && (
              <p className="rounded-lg bg-flag-soft px-3 py-2 text-flag">
                Your last request was not approved{latest.admin_note ? `: ${latest.admin_note}` : "."} You can try again.
              </p>
            )}
            <VerificationForm />
          </div>
        )}
      </Section>

      {blocks && blocks.length > 0 && (
        <Section title="Blocked members">
          <ul className="grid gap-2">
            {blocks.map((b) => (
              <li key={b.blocked_id} className="flex items-center justify-between gap-3">
                <span>{(b.blocked as unknown as { display_name: string } | null)?.display_name ?? "Member"}</span>
                <form action={unblockMember}>
                  <input type="hidden" name="user_id" value={b.blocked_id} />
                  <input type="hidden" name="back" value="/account" />
                  <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Unblock</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Delete account">
        <DeleteAccountForm />
      </Section>
    </div>
  );
}
