"use client";

import { useEffect } from "react";

/**
 * Email links put their result after "#" in the address. If Supabase sends a
 * member to the wrong page (e.g. the home page, when the redirect list isn't
 * set up), forward them to the right one.
 */
export function EmailLinkHandler() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.has("access_token") && !hash.has("error_code") && !hash.has("error")) return;
    const path = window.location.pathname;
    const type = hash.get("type");
    if (type === "recovery" && path !== "/reset-password") {
      window.location.replace(`/reset-password${window.location.hash}`);
    } else if (hash.has("error_code") || hash.has("error")) {
      if (path !== "/reset-password" && path !== "/login") window.location.replace(`/login?error=link`);
    } else if (path !== "/reset-password" && path !== "/login") {
      window.location.replace("/login?confirmed=1");
    }
  }, []);
  return null;
}
