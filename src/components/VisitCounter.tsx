"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless/i;

/**
 * Counts one page view per page opened, for the admin dashboard. Sends only the
 * page address and whether this is the browser's first page today. The browser
 * remembers just today's date.
 */
export function VisitCounter() {
  const path = usePathname();
  useEffect(() => {
    if (navigator.webdriver || BOTS.test(navigator.userAgent)) return;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bahrain" });
    let isNew = true;
    try {
      isNew = localStorage.getItem("pinoybh-seen") !== today;
      localStorage.setItem("pinoybh-seen", today);
    } catch {
      // Private browsing or storage blocked: count as a new visitor.
    }
    createClient()
      .rpc("record_visit", { p_path: path, p_new_visitor: isNew })
      .then(() => undefined, () => undefined);
  }, [path]);
  return null;
}
