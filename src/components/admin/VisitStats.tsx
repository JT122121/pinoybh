import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Day = { day: string; views: number; visitors: number };
type Page = { path: string; views: number; visitors: number };

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/marketplace": "Marketplace",
  "/jobs": "Jobs",
  "/events": "Events",
  "/rules": "Community rules",
  "/about": "About",
  "/safety": "Stay safe",
  "/signup": "Sign up",
  "/login": "Log in",
  "/posts/new": "Add a post",
  "/account": "My posts & settings",
  "(other)": "Other pages",
};

const UUID = /^\/(posts|u)\/([0-9a-f-]{36})$/;

function dayLabel(day: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

export async function VisitStats() {
  const supabase = await createClient();
  const [{ data: totals }, { data: top }] = await Promise.all([
    supabase.rpc("visit_totals", { p_days: 30 }),
    supabase.rpc("top_pages", { p_days: 7, p_limit: 10 }),
  ]);
  const days = ((totals ?? []) as Day[]).map((d) => ({ ...d, views: Number(d.views), visitors: Number(d.visitors) }));
  const pages = ((top ?? []) as Page[]).map((p) => ({ ...p, views: Number(p.views) }));

  // Names for post and member pages.
  const postIds = pages.flatMap((p) => (UUID.exec(p.path)?.[1] === "posts" ? [UUID.exec(p.path)![2]] : []));
  const userIds = pages.flatMap((p) => (UUID.exec(p.path)?.[1] === "u" ? [UUID.exec(p.path)![2]] : []));
  const [{ data: posts }, { data: people }] = await Promise.all([
    postIds.length ? supabase.from("posts").select("id, title").in("id", postIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from("profiles").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>([
    ...(posts ?? []).map((p: { id: string; title: string }) => [`/posts/${p.id}`, p.title] as [string, string]),
    ...(people ?? []).map((p: { id: string; display_name: string }) => [`/u/${p.id}`, `${p.display_name} (profile)`] as [string, string]),
  ]);
  const pageName = (path: string) => PAGE_NAMES[path] ?? names.get(path) ?? path;

  const sum = (list: Day[], key: "views" | "visitors") => list.reduce((n, d) => n + d[key], 0);
  const today = days.at(-1);
  const yesterday = days.at(-2);
  const tiles = [
    { label: "Today", visitors: today?.visitors ?? 0, views: today?.views ?? 0 },
    { label: "Yesterday", visitors: yesterday?.visitors ?? 0, views: yesterday?.views ?? 0 },
    { label: "Last 7 days", visitors: sum(days.slice(-7), "visitors"), views: sum(days.slice(-7), "views") },
    { label: "Last 30 days", visitors: sum(days, "visitors"), views: sum(days, "views") },
  ];

  const chart = days.slice(-14);
  const max = Math.max(1, ...chart.map((d) => d.visitors));
  const fmt = (n: number) => n.toLocaleString("en-GB");

  return (
    <section aria-labelledby="visits" className="grid gap-4">
      <h2 id="visits" className="heading text-2xl">Site visits</h2>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="panel p-5">
            <p className="font-bold text-muted">{t.label}</p>
            <p className="display mt-1 text-4xl">{fmt(t.visitors)}</p>
            <p className="text-[0.9375rem]">
              {t.visitors === 1 ? "visit" : "visits"} · {fmt(t.views)} page {t.views === 1 ? "view" : "views"}
            </p>
          </li>
        ))}
      </ul>

      <div className="panel p-5">
        <h3 className="font-bold">Visits per day, last 14 days</h3>
        <div className="mt-6 flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label="Visits per day for the last 14 days. The numbers are in the table below.">
          {chart.map((d) => (
            <div key={d.day} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none">
              <div
                className="w-full rounded-t bg-ink group-hover:bg-ink-soft group-focus:bg-ink-soft"
                style={{ height: `${(d.visitors / max) * 100}%`, minHeight: d.visitors ? 4 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-sm text-white shadow-lg group-hover:block group-focus:block">
                <span className="font-bold">{dayLabel(d.day, { weekday: "short", day: "numeric", month: "short" })}</span>
                <br />
                {fmt(d.visitors)} {d.visitors === 1 ? "visit" : "visits"}, {fmt(d.views)} page {d.views === 1 ? "view" : "views"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>{chart[0] && dayLabel(chart[0].day, { day: "numeric", month: "short" })}</span>
          <span>Today</span>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-[0.9375rem] font-bold underline">Show as a table</summary>
          <table className="mt-3 w-full text-left text-[0.9375rem]">
            <thead className="text-muted">
              <tr><th className="py-1 font-bold">Day</th><th className="py-1 text-right font-bold">Visits</th><th className="py-1 text-right font-bold">Page views</th></tr>
            </thead>
            <tbody>
              {[...chart].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1">{dayLabel(d.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1 text-right">{fmt(d.visitors)}</td>
                  <td className="py-1 text-right">{fmt(d.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="panel p-5">
        <h3 className="font-bold">Most viewed pages, last 7 days</h3>
        {pages.length ? (
          <ol className="mt-3 grid gap-1">
            {pages.map((p) => (
              <li key={p.path} className="flex items-baseline justify-between gap-4 border-t border-line py-2 first:border-t-0">
                {p.path.startsWith("/") ? (
                  <Link href={p.path} className="min-w-0 truncate underline">{pageName(p.path)}</Link>
                ) : (
                  <span className="min-w-0 truncate">{pageName(p.path)}</span>
                )}
                <span className="shrink-0 text-muted">{fmt(p.views)} {p.views === 1 ? "view" : "views"}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-muted">No visits counted yet.</p>
        )}
      </div>

      <p className="text-sm text-muted">
        A visit is one person on one day: someone who comes back tomorrow counts again. Days are in Bahrain time. Admin pages
        and search engine bots aren&rsquo;t counted, but your own visits to the rest of the site are. No IP addresses or
        cookies are used.
      </p>
    </section>
  );
}
