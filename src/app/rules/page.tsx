import { TextPage } from "@/components/TextPage";
import { RULES } from "@/content/rules";

export const metadata = { title: "Community rules" };

export default function RulesPage() {
  return (
    <TextPage title="Community rules" intro="These rules keep PinoyBH safe and friendly for everyone. Everyone agrees to them when they join.">
      {/* The rules are a real list members refer to by number, so they are numbered. */}
      <ol className="grid gap-4">
        {RULES.map((rule, i) => (
          <li key={rule.title} className="panel flex gap-4 p-5">
            <span className="display text-3xl text-sun" aria-hidden>{i + 1}</span>
            <div>
              <h2 className="heading !m-0 text-xl">{rule.title}</h2>
              <p className="mt-1">{rule.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <h2>What happens if someone breaks the rules</h2>
      <p>
        Moderators can remove posts and ban accounts. A post that several members report is hidden until a moderator checks it.
        Posts that mention fees, visas or banned items are checked before they go live.
      </p>
      <p>See something wrong? Use the Report button on the post or profile.</p>
    </TextPage>
  );
}
