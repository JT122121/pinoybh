import Link from "next/link";
import { PostList } from "@/components/PostRow";
import { Sun } from "@/components/Sun";
import { COMMUNITY_STATEMENT } from "@/lib/constants";
import { getCategories, searchPosts } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  const [listings, jobs, categories, viewer] = await Promise.all([
    searchPosts({ kind: "listing" }),
    searchPosts({ kind: "job" }),
    getCategories("listing"),
    getViewer(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        {/* On phones the sun sits behind the text, so it is a tonal blue there to keep the white text readable. */}
        <Sun className="sun-turn pointer-events-none absolute -right-28 -top-24 h-[22rem] w-[22rem] text-ink-soft sm:-right-10 sm:-top-20 sm:h-[30rem] sm:w-[30rem] sm:text-sun" />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pb-16 sm:pt-16">
          <h1 className="display max-w-[11ch] text-[3.25rem] sm:text-[5.5rem]">
            Mabuhay, Kabayan!
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/90 sm:text-xl">{COMMUNITY_STATEMENT}</p>

          <form action="/marketplace" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">What are you looking for?</span>
              <input
                name="q"
                type="search"
                placeholder="Bedspace, pasalubong, driver..."
                className="input border-transparent"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Search items</button>
              <button type="submit" formAction="/jobs" className="btn btn-sun flex-1">Search jobs</button>
            </div>
          </form>

          {!viewer && (
            <p className="mt-6 text-white/90">
              New here? <Link href="/signup" className="font-bold text-sun underline">Join for free</Link> to post and contact sellers.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <nav aria-label="Popular categories" className="relative z-10 -mt-6 flex gap-2 overflow-x-auto px-1 pb-2 pt-1">
          {categories.slice(5, 9).concat(categories.slice(0, 2)).map((c) => (
            <Link key={c.slug} href={`/marketplace?category=${c.slug}`} className="btn btn-quiet btn-small shadow-sm">
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="new-items">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="new-items" className="heading text-2xl">New in the marketplace</h2>
              <Link href="/marketplace" className="font-bold underline">See all</Link>
            </div>
            <PostList
              posts={listings.slice(0, 6)}
              empty={<p>No items yet. <Link href="/posts/new?kind=listing" className="font-bold underline">Post the first one</Link>.</p>}
            />
          </section>
          <section aria-labelledby="new-jobs">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="new-jobs" className="heading text-2xl">New jobs</h2>
              <Link href="/jobs" className="font-bold underline">See all</Link>
            </div>
            <PostList
              posts={jobs.slice(0, 6)}
              empty={<p>No jobs yet. <Link href="/posts/new?kind=job" className="font-bold underline">Post the first one</Link>.</p>}
            />
          </section>
        </div>

        <section className="mt-10 grid gap-4 rounded-2xl border-2 border-flag/30 bg-paper p-5 sm:grid-cols-[auto_1fr] sm:items-center" aria-labelledby="safety">
          <h2 id="safety" className="heading text-xl text-flag">Never pay to get a job.</h2>
          <p>
            No real employer asks for a fee, a deposit or "processing" money. Don't carry packages for people you don't know.{" "}
            <Link href="/safety" className="font-bold underline">More ways to stay safe</Link>
          </p>
        </section>
      </div>
    </>
  );
}
