import Link from "next/link";
import { reviewVerification } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  social_url: string;
  ph_mobile: string | null;
  code: string;
  created_at: string;
  member: { id: string; display_name: string; created_at: string } | null;
};

export default async function VerificationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("id, social_url, ph_mobile, code, created_at, member:profiles!verification_requests_user_id_fkey(id, display_name, created_at)")
    .eq("status", "pending")
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="grid gap-4">
      <div className="panel p-5">
        <h2 className="heading text-xl">How to check a request</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the profile link.</li>
          <li>Find the code (for example KABAYAN-1A2B3C) in the bio or intro. No code means reject: anyone can paste someone else&rsquo;s link.</li>
          <li>Check the profile looks real and connected to the Filipino community in Bahrain.</li>
          <li>Never ask for a passport, CPR or ID photo.</li>
        </ol>
      </div>
      {rows.length === 0 && <p className="panel p-5">No requests waiting.</p>}
      {rows.map((r) => (
        <div key={r.id} className="panel grid gap-3 p-5">
          <p>
            <Link href={`/u/${r.member?.id}`} className="font-bold underline">{r.member?.display_name}</Link>{" "}
            <span className="text-sm text-muted">asked {timeAgo(r.created_at)}</span>
          </p>
          <p>
            Profile: <a href={r.social_url} target="_blank" rel="noreferrer nofollow" className="break-all font-bold underline">{r.social_url}</a>
          </p>
          <p>
            Code to look for: <span className="display text-xl">{r.code}</span>
          </p>
          {r.ph_mobile && <p>PH mobile (not verified by SMS): {r.ph_mobile}</p>}
          <div className="flex flex-wrap gap-2">
            <form action={reviewVerification}>
              <input type="hidden" name="request_id" value={r.id} />
              <input type="hidden" name="approve" value="true" />
              <input type="hidden" name="note" value="Code found in profile" />
              <SubmitButton className="btn btn-primary btn-small" pendingText="...">Code found, approve</SubmitButton>
            </form>
            <form action={reviewVerification} className="flex flex-wrap gap-2">
              <input type="hidden" name="request_id" value={r.id} />
              <input type="hidden" name="approve" value="false" />
              <input name="note" defaultValue="We couldn't find the code on your profile." className="input min-h-9 py-1 text-[0.9375rem]" />
              <SubmitButton className="btn btn-danger btn-small" pendingText="...">Reject</SubmitButton>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
