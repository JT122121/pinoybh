import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const LABEL: Record<string, string> = {
  ban: "Banned a member",
  unban: "Unbanned a member",
  verify_approve: "Approved a badge",
  verify_reject: "Rejected a badge request",
  verify_revoke: "Removed a badge",
  post_active: "Put a post live",
  post_removed: "Removed a post",
  post_hidden: "Hid a post",
  post_closed: "Closed a post",
  post_pending_review: "Sent a post to review",
  report_actioned: "Actioned a report",
  report_dismissed: "Dismissed a report",
};

export default async function LogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_actions")
    .select("id, action, note, created_at, target_user_id, target_post_id, admin:profiles!admin_actions_admin_id_fkey(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  type Row = { id: number; action: string; note: string | null; created_at: string; target_user_id: string | null; target_post_id: string | null; admin: { display_name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-left text-[0.9375rem]">
        <thead className="border-b border-line">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Moderator</th>
            <th className="p-3">Action</th>
            <th className="p-3">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Bahrain" })}</td>
              <td className="p-3">{r.admin?.display_name ?? "Deleted"}</td>
              <td className="p-3">
                {r.target_post_id ? <Link href={`/posts/${r.target_post_id}`} className="underline">{LABEL[r.action] ?? r.action}</Link>
                  : r.target_user_id ? <Link href={`/u/${r.target_user_id}`} className="underline">{LABEL[r.action] ?? r.action}</Link>
                  : (LABEL[r.action] ?? r.action)}
              </td>
              <td className="p-3">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-5">No actions yet.</p>}
    </div>
  );
}
