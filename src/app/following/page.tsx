import Link from "next/link";
import { unfollow } from "@/app/actions/social";
import { SubmitButton } from "@/components/SubmitButton";
import { KIND_LABEL, KIND_PATH } from "@/lib/kinds";
import type { PostKind } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";

export const metadata = { title: "What I follow" };

export default async function FollowingPage() {
  await requireViewer("/following");
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("id, search_query, search_kind, created_at, member:profiles!follows_followed_user_id_fkey(id, display_name), category:categories(slug, name, kind)")
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    search_query: string | null;
    search_kind: PostKind | null;
    member: { id: string; display_name: string } | null;
    category: { slug: string; name: string; kind: PostKind } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const groups: { title: string; rows: Row[]; render: (r: Row) => React.ReactNode }[] = [
    { title: "Members", rows: rows.filter((r) => r.member), render: (r) => <Link href={`/u/${r.member!.id}`} className="font-bold underline">{r.member!.display_name}</Link> },
    { title: "Categories", rows: rows.filter((r) => r.category), render: (r) => <Link href={`${KIND_PATH[r.category!.kind]}?category=${r.category!.slug}`} className="font-bold underline">{r.category!.name}</Link> },
    {
      title: "Searches",
      rows: rows.filter((r) => r.search_query),
      render: (r) => (
        <Link href={`${KIND_PATH[r.search_kind ?? "listing"]}?q=${encodeURIComponent(r.search_query!)}`} className="font-bold underline">
          &ldquo;{r.search_query}&rdquo; in {KIND_LABEL[r.search_kind ?? "listing"]}
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="display text-4xl">What I follow</h1>
      <p className="mt-3 text-muted">
        You get a notification when there's a new post from these members, categories or searches. Nobody else can see this list.
      </p>
      {rows.length === 0 && (
        <p className="panel mt-6 p-5">
          You're not following anything yet. Search the <Link href="/marketplace" className="font-bold underline">marketplace</Link> or{" "}
          <Link href="/jobs" className="font-bold underline">jobs</Link>, then tap Follow.
        </p>
      )}
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={g.title} className="mt-6">
          <h2 className="heading mb-2 text-xl">{g.title}</h2>
          <ul className="panel divide-y divide-line">
            {g.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                {g.render(r)}
                <form action={unfollow}>
                  <input type="hidden" name="follow_id" value={r.id} />
                  <input type="hidden" name="back" value="/following" />
                  <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Unfollow</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
