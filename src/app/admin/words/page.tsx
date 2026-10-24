import { addFlagTerm, addSynonymGroup, deleteFlagTerm, deleteSynonymGroup } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";

export default async function WordsPage() {
  const supabase = await createClient();
  const [{ data: groups }, { data: flags }] = await Promise.all([
    supabase.from("synonym_groups").select("id, terms").order("id"),
    supabase.from("flag_terms").select("term, applies_to").order("term"),
  ]);

  return (
    <div className="grid gap-6">
      <section className="panel grid gap-3 p-5">
        <h2 className="heading text-xl">Search words that mean the same thing</h2>
        <p className="text-muted">
          A search for any word in a group also finds the others. Small spelling mistakes are matched automatically.
        </p>
        <ul className="divide-y divide-line">
          {(groups ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2">
              <span>{(g.terms as string[]).join(", ")}</span>
              <form action={deleteSynonymGroup}>
                <input type="hidden" name="id" value={g.id} />
                <SubmitButton className="btn btn-quiet btn-small" pendingText="...">Delete</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={addSynonymGroup} className="flex flex-wrap gap-2">
          <input name="terms" required placeholder="e.g. kotse, car, sasakyan" className="input flex-1" />
          <SubmitButton className="btn btn-primary" pendingText="...">Add group</SubmitButton>
        </form>
      </section>

      <section className="panel grid gap-3 p-5">
        <h2 className="heading text-xl">Words that send a post to the review queue</h2>
        <p className="text-muted">Posts with these words wait for a moderator before going live. Checked on every edit too.</p>
        <ul className="flex flex-wrap gap-2">
          {(flags ?? []).map((f) => (
            <li key={f.term}>
              <form action={deleteFlagTerm} className="flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1">
                <span>{f.term}</span>
                <span className="text-sm text-muted">({f.applies_to ?? "all"})</span>
                <input type="hidden" name="term" value={f.term} />
                <SubmitButton className="rounded-full px-2 font-bold text-flag" pendingText="..." aria-label={`Remove ${f.term}`}>x</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={addFlagTerm} className="flex flex-wrap gap-2">
          <input name="term" required placeholder="e.g. reservation fee" className="input flex-1" />
          <select name="applies_to" className="input w-auto" defaultValue="">
            <option value="">All posts</option>
            <option value="job">Jobs only</option>
            <option value="listing">Marketplace only</option>
          </select>
          <SubmitButton className="btn btn-primary" pendingText="...">Add word</SubmitButton>
        </form>
      </section>
    </div>
  );
}
