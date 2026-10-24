"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CLIENT = "ca-pub-9013281257238178";

/**
 * Google AdSense on every page except the admin pages, which show member
 * emails. The admin link does a full page load (see AccountMenu); if the
 * script is already running anyway (e.g. after the Back button), admin
 * reloads without it.
 */
export function AdSense() {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  useEffect(() => {
    if (isAdmin && document.getElementById("adsense")) window.location.reload();
  }, [isAdmin]);
  if (isAdmin) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
