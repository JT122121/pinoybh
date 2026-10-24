import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";

const TABS = [
  ["/admin", "Overview"],
  ["/admin/reports", "Reports"],
  ["/admin/review", "Review queue"],
  ["/admin/verification", "Verification"],
  ["/admin/members", "Members"],
  ["/admin/words", "Search & flag words"],
  ["/admin/log", "Action log"],
] as const;

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer?.isStaff) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <h1 className="display text-3xl">Moderation</h1>
      <nav aria-label="Admin" className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="btn btn-quiet btn-small">{label}</Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
