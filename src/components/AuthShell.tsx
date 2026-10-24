import { COMMUNITY_STATEMENT } from "@/lib/constants";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="display text-4xl">{title}</h1>
      <p className="mt-3 text-muted">{COMMUNITY_STATEMENT}</p>
      <div className="panel mt-6 p-5 sm:p-6">{children}</div>
    </div>
  );
}
