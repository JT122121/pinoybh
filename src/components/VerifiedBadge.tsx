import { Sun } from "./Sun";

/**
 * "Verified Kabayan" means a moderator confirmed this person is part of the
 * community. It never means "trusted seller", and the label says so.
 */
export function VerifiedBadge({ size = "small" }: { size?: "small" | "large" }) {
  const explanation = "A moderator confirmed this member is part of the community. It does not mean they are a trusted seller or employer. Always stay careful.";
  if (size === "large") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-sun-soft p-3">
        <Sun className="mt-0.5 h-6 w-6 shrink-0 text-ink" />
        <div>
          <p className="font-bold">Verified Kabayan</p>
          <p className="text-[0.9375rem] text-muted">{explanation}</p>
        </div>
      </div>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-sm font-bold text-ink"
      title={explanation}
    >
      <Sun className="h-3.5 w-3.5" />
      Verified Kabayan
    </span>
  );
}
