"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/format";

/** Facebook-style menu behind the member's profile picture. */
export function AccountMenu({
  userId,
  name,
  avatarPath,
  isStaff,
}: {
  userId: string;
  name: string;
  avatarPath: string | null;
  isStaff: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close after navigating, on outside click, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (size: string) => (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-sun font-bold text-ink ${size}`}>
      {avatarPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(avatarPath)} alt="" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );

  const item = "flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold hover:bg-surface";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Your account"
        className="block rounded-full ring-2 ring-transparent hover:ring-sun focus-visible:ring-sun"
      >
        {avatar("h-10 w-10 text-lg")}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-line bg-paper p-2 text-ink shadow-xl">
          <Link href={`/u/${userId}`} role="menuitem" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface">
            {avatar("h-11 w-11 text-lg")}
            <span className="min-w-0">
              <span className="block truncate font-bold">{name}</span>
              <span className="text-sm text-muted">See your profile</span>
            </span>
          </Link>
          <hr className="my-2 border-line" />
          <Link href="/account" role="menuitem" className={item}>My posts &amp; settings</Link>
          <Link href="/following" role="menuitem" className={item}>What I follow</Link>
          <Link href="/notifications" role="menuitem" className={item}>Notifications</Link>
          {/* A full page load, so the ad script from the public pages isn't carried into admin. */}
          {isStaff && <a href="/admin" role="menuitem" className={item}>Admin dashboard</a>}
          <Link href="/rules" role="menuitem" className={item}>Community rules</Link>
          <hr className="my-2 border-line" />
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" className={`${item} w-full text-left`}>Log out</button>
          </form>
        </div>
      )}
    </div>
  );
}
