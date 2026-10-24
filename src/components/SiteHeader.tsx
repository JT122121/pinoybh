import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Sun } from "./Sun";

export async function SiteHeader() {
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 lg:px-8 py-3">
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="PinoyBH home">
          <Sun className="h-7 w-7 text-sun" />
          <span className="display text-2xl">PinoyBH</span>
        </Link>

        <nav aria-label="Main" className="order-3 flex w-full gap-5 text-[0.9375rem] font-bold sm:order-none sm:w-auto">
          <Link href="/marketplace" className="hover:text-sun">Marketplace</Link>
          <Link href="/jobs" className="hover:text-sun">Jobs</Link>
          <Link href="/rules" className="hover:text-sun">Community rules</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {viewer ? (
            <>
              <Link href="/notifications" className="relative rounded-full p-2 hover:bg-ink-soft" aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-xs font-bold text-ink">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              {viewer.isStaff && (
                <Link href="/admin" className="text-[0.9375rem] font-bold hover:text-sun">Admin</Link>
              )}
              <Link href="/account" className="text-[0.9375rem] font-bold hover:text-sun">
                {viewer.profile.display_name}
              </Link>
              <Link href="/posts/new" className="btn btn-sun btn-small">Post</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[0.9375rem] font-bold hover:text-sun">Log in</Link>
              <Link href="/signup" className="btn btn-sun btn-small">Join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
