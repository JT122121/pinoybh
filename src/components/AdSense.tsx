"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ADSENSE_SRC, isAdFreePath } from "@/lib/adsense";

/**
 * The ad script is in the page <head> for every page except admin (see the
 * root layout), which is what Google's site check looks for. This covers
 * moving between pages without a reload: it adds the script when leaving
 * admin, and reloads admin without it if it's already running (e.g. Back).
 */
export function AdSense() {
  const path = usePathname();
  const adFree = isAdFreePath(path);
  useEffect(() => {
    const loaded = document.querySelector(`script[src="${ADSENSE_SRC}"]`);
    if (adFree && loaded) {
      window.location.reload();
    } else if (!adFree && !loaded) {
      const s = document.createElement("script");
      s.async = true;
      s.src = ADSENSE_SRC;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
  }, [adFree]);
  return null;
}
