import Link from "next/link";
import { COMMUNITY_STATEMENT } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 lg:px-8 py-8 text-[0.9375rem] text-muted sm:flex-row sm:justify-between">
        <p className="max-w-sm">{COMMUNITY_STATEMENT} Run by volunteers from the community.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-ink">
          <Link href="/about">About</Link>
          <Link href="/rules">Community rules</Link>
          <Link href="/safety">Stay safe</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </nav>
      </div>
    </footer>
  );
}
