import Link from "next/link";
import { revokeVerification } from "@/app/actions/admin";
import { BanForm } from "@/components/admin/BanForm";
import { SubmitButton } from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; banned?: string }> }) {
  const { q, banned } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("display_name", `%${q.replace(/[%_]/g, "")}%`);
  if (banned === "1") query = query.eq("is_banned", true);
  const { data } = await query;
  const members = (data ?? []) as Profile[];

  return (
    <div className="grid gap-4">
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name" className="input max-w-xs" />
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="banned" value="1" defaultChecked={banned === "1"} className="h-5 w-5 accent-ink" />
          Banned only
        </label>
        <button className="btn btn-primary">Search</button>
      </form>
      <ul className="grid gap-3">
        {members.map((m) => (
          <li key={m.id} className="panel grid gap-2 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/u/${m.id}`} className="font-bold underline">{m.display_name}</Link>
              <span className="text-sm text-muted">
                {m.role !== "member" && <strong className="mr-2">{m.role}</strong>}
                {m.is_verified && <strong className="mr-2">verified</strong>}
                {m.is_banned && <strong className="mr-2 text-flag">banned</strong>}
                joined {timeAgo(m.created_at)}
              </span>
            </div>
            {m.role !== "admin" && <BanForm userId={m.id} banned={m.is_banned} />}
            {m.is_verified && (
              <form action={revokeVerification} className="flex flex-wrap gap-2">
                <input type="hidden" name="user_id" value={m.id} />
                <input name="note" required placeholder="Why remove the badge" className="input min-h-9 flex-1 py-1 text-[0.9375rem]" />
                <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Remove badge</SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
