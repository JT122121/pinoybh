"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; theme?: string; size?: string }) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile check for sign-up, login and password reset.
 * Adds a hidden "cf-turnstile-response" field to the form. Renders nothing
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set (CAPTCHA off in Supabase).
 * Change `resetKey` after a failed submit: each token works only once.
 */
export function Captcha({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(typeof window !== "undefined" && Boolean(window.turnstile));

  useEffect(() => {
    if (!SITE_KEY || !loaded || !box.current || !window.turnstile) return;
    widget.current = window.turnstile.render(box.current, { sitekey: SITE_KEY, theme: "light", size: "flexible" });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setLoaded(true)} />
      <div ref={box} className="min-h-[65px]" />
    </>
  );
}
