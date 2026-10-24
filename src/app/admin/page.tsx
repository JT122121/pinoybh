import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [reports, review, hidden, verification, comments] = await Promise.all([
    count(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "hidden")),
    count(supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("comments").select("id", { count: "exact", head: true }).in("status", ["pending_review", "hidden"])),
  ]);
  const tiles = [
    { href: "/admin/reports", n: reports, label: "open reports" },
    { href: "/admin/review", n: review, label: "posts waiting for review" },
    { href: "/admin/review", n: hidden, label: "posts hidden after reports" },
    { href: "/admin/review", n: comments, label: "comments waiting for review" },
    { href: "/admin/verification", n: verification, label: "verification requests" },
  ];
  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className={`panel flex items-baseline gap-3 p-5 ${t.n ? "border-2 border-ink" : ""}`}>
              <span className="display text-4xl">{t.n}</span>
              <span className="font-bold">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-muted">
        Try to clear reports and the review queue every day. Posts flagged for fees or visas stay hidden until you approve them,
        so a long queue means real members are waiting.
      </p>
    </div>
  );
}
