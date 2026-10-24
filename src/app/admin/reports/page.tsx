import Link from "next/link";
import { resolveReport, setPostStatus } from "@/app/actions/admin";
import { BanForm } from "@/components/admin/BanForm";
import { SubmitButton } from "@/components/SubmitButton";
import { REPORT_REASON_LABEL, STATUS_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { PostStatus, ReportReason } from "@/lib/types";

type Row = {
  id: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
  reporter: { id: string; display_name: string } | null;
  post: { id: string; title: string; status: PostStatus; author_id: string } | null;
  target: { id: string; display_name: string; is_banned: boolean } | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(id, display_name), post:posts(id, title, status, author_id), target:profiles!reports_profile_id_fkey(id, display_name, is_banned)",
    )
    .eq("status", "open")
    .order("created_at")
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  // Group by what was reported, so 5 reports on one post are one item.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.post ? `post:${r.post.id}` : `profile:${r.target?.id}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  if (groups.size === 0) return <p className="panel p-5">No open reports. Nice work.</p>;

  return (
    <ul className="grid gap-4">
      {[...groups.entries()].map(([key, reports]) => {
        const first = reports[0];
        return (
          <li key={key} className="panel grid gap-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              {first.post ? (
                <p>
                  Post: <Link href={`/posts/${first.post.id}`} className="font-bold underline">{first.post.title}</Link>{" "}
                  <span className="text-muted">({STATUS_LABEL[first.post.status]})</span>
                </p>
              ) : (
                <p>
                  Member: <Link href={`/u/${first.target?.id}`} className="font-bold underline">{first.target?.display_name}</Link>
                  {first.target?.is_banned && <span className="text-flag"> (banned)</span>}
                </p>
              )}
              <span className="font-bold">{reports.length} {reports.length === 1 ? "report" : "reports"}</span>
            </div>
            <ul className="grid gap-2">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-surface p-3">
                  <div>
                    <p>
                      <span className="font-bold">{REPORT_REASON_LABEL[r.reason]}</span>{" "}
                      <span className="text-sm text-muted">by {r.reporter?.display_name ?? "deleted member"}, {timeAgo(r.created_at)}</span>
                    </p>
                    {r.details && <p className="mt-1 whitespace-pre-line">{r.details}</p>}
                  </div>
                  <form action={resolveReport}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Dismiss</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {first.post && (
                <>
                  <form action={setPostStatus}>
                    <input type="hidden" name="post_id" value={first.post.id} />
                    <input type="hidden" name="status" value="removed" />
                    <input type="hidden" name="note" value={`Reports: ${reports.map((r) => r.reason).join(", ")}`} />
                    <SubmitButton className="btn btn-danger btn-small" pendingText="...">Remove post</SubmitButton>
                  </form>
                  <form action={setPostStatus}>
                    <input type="hidden" name="post_id" value={first.post.id} />
                    <input type="hidden" name="status" value="active" />
                    <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Post is fine, keep it live</SubmitButton>
                  </form>
                </>
              )}
            </div>
            <BanForm userId={first.post ? first.post.author_id : first.target!.id} banned={Boolean(first.target?.is_banned)} />
          </li>
        );
      })}
    </ul>
  );
}
