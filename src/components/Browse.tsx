import Link from "next/link";
import { followCategory, followSearch, unfollow } from "@/app/actions/social";
import { AREAS } from "@/lib/constants";
import { getCategories, PAGE_SIZE, searchPosts, type SearchFilters } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostKind } from "@/lib/types";
import { getViewer } from "@/lib/viewer";
import { PostList } from "./PostRow";
import { SubmitButton } from "./SubmitButton";

const COPY: Record<PostKind, { title: string; intro: string; placeholder: string; postLabel: string }> = {
  listing: {
    title: "Marketplace",
    intro: "Buy, sell and give away within the community. Meet in public places and never pay before you see the item.",
    placeholder: "Try bedspace, pasalubong, rice cooker",
    postLabel: "Sell something",
  },
  job: {
    title: "Jobs",
    intro: "Work posted by kabayan, for kabayan. No agencies. No one should ever ask you to pay to get a job.",
    placeholder: "Try driver, kasambahay, cashier",
    postLabel: "Post a job",
  },
};

export async function Browse({ kind, filters, basePath }: { kind: PostKind; filters: SearchFilters; basePath: string }) {
  const [categories, results, viewer] = await Promise.all([getCategories(kind), searchPosts(filters), getViewer()]);
  const posts = results.slice(0, PAGE_SIZE);
  const hasMore = results.length > PAGE_SIZE;
  const copy = COPY[kind];

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: filters.q, category: filters.category, area: filters.area, min: filters.min, max: filters.max, verified: filters.verified ? "1" : undefined })) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const back = `${basePath}${params.size ? `?${params}` : ""}`;
  const pageHref = (page: number) => {
    const p = new URLSearchParams(params);
    if (page > 1) p.set("page", String(page));
    return `${basePath}${p.size ? `?${p}` : ""}`;
  };

  // Is the viewer already following this search or category?
  let searchFollowId: string | null = null;
  let categoryFollowId: string | null = null;
  if (viewer && (filters.q || filters.category)) {
    const supabase = await createClient();
    const { data } = await supabase.from("follows").select("id, search_query, search_kind, category_slug");
    for (const f of data ?? []) {
      if (filters.q && f.search_query?.toLowerCase() === filters.q.toLowerCase() && f.search_kind === kind) searchFollowId = f.id;
      if (filters.category && f.category_slug === filters.category) categoryFollowId = f.id;
    }
  }
  const categoryName = categories.find((c) => c.slug === filters.category)?.name;

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl sm:text-5xl">{copy.title}</h1>
          <p className="mt-3 max-w-2xl text-muted">{copy.intro}</p>
        </div>
        <Link href={`/posts/new?kind=${kind}`} className="btn btn-primary">{copy.postLabel}</Link>
      </div>

      <form action={basePath} className="panel mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <label className="field">
          <span className="sr-only">Search</span>
          <input name="q" type="search" defaultValue={filters.q} placeholder={copy.placeholder} className="input" />
        </label>
        <button className="btn btn-primary" type="submit">Search</button>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-4">
          <select name="category" defaultValue={filters.category ?? ""} className="input" aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select name="area" defaultValue={filters.area ?? ""} className="input" aria-label="Area">
            <option value="">All of Bahrain</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          {kind === "listing" ? (
            <div className="flex gap-2">
              <input name="min" type="number" min="0" step="any" defaultValue={filters.min} placeholder="Min BD" className="input" aria-label="Minimum price in BD" />
              <input name="max" type="number" min="0" step="any" defaultValue={filters.max} placeholder="Max BD" className="input" aria-label="Maximum price in BD" />
            </div>
          ) : (
            <div />
          )}
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="h-5 w-5 accent-ink" />
            Verified Kabayan only
          </label>
        </div>
      </form>

      <nav aria-label="Categories" className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
        <Link href={basePath} className={`btn btn-small ${!filters.category ? "btn-primary" : "btn-quiet"}`}>All</Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`${basePath}?category=${c.slug}`}
            className={`btn btn-small ${filters.category === c.slug ? "btn-primary" : "btn-quiet"}`}
            aria-current={filters.category === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {viewer && (filters.q || filters.category) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.q && (
            <form action={searchFollowId ? unfollow : followSearch}>
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="q" value={filters.q} />
              <input type="hidden" name="kind" value={kind} />
              {searchFollowId && <input type="hidden" name="follow_id" value={searchFollowId} />}
              <SubmitButton className="btn btn-quiet btn-small" pendingText="Saving...">
                {searchFollowId ? `Stop following "${filters.q}"` : `Follow "${filters.q}" and get new matches`}
              </SubmitButton>
            </form>
          )}
          {filters.category && categoryName && (
            <form action={categoryFollowId ? unfollow : followCategory}>
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="category" value={filters.category} />
              {categoryFollowId && <input type="hidden" name="follow_id" value={categoryFollowId} />}
              <SubmitButton className="btn btn-quiet btn-small" pendingText="Saving...">
                {categoryFollowId ? `Stop following ${categoryName}` : `Follow ${categoryName}`}
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      <section className="mt-6" aria-label="Results">
        <PostList
          wide
          posts={posts}
          empty={
            <>
              <p className="font-bold">Nothing here yet.</p>
              <p className="mt-1 text-muted">
                {filters.q ? "Try a shorter search or another spelling. " : ""}
                {viewer && filters.q ? "Follow this search and we'll tell you when something matches." : "Be the first to post."}
              </p>
            </>
          }
        />
        {(filters.page! > 1 || hasMore) && (
          <div className="mt-4 flex justify-between">
            {filters.page! > 1 ? <Link href={pageHref(filters.page! - 1)} className="btn btn-quiet">Newer</Link> : <span />}
            {hasMore && <Link href={pageHref(filters.page! + 1)} className="btn btn-quiet">Older</Link>}
          </div>
        )}
      </section>
    </div>
  );
}
