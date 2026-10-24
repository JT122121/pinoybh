export function TextPage({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 max-w-[60ch] text-lg">{intro}</p>}
      <div className="prose-plain mt-6">{children}</div>
    </div>
  );
}

export function contactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "the moderators";
}
