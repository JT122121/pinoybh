"use client";

import { useState } from "react";

/** Share a post to WhatsApp, Facebook or Instagram, or copy its link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [note, setNote] = useState<string | null>(null);
  const link = url || (typeof window !== "undefined" ? window.location.href : "");

  async function copy(message: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNote(message);
    } catch {
      setNote(`Copy this link: ${link}`);
    }
  }

  // Instagram has no "share a link" address for websites. On phones, the
  // phone's share menu includes Instagram (Stories and DMs) if it's installed.
  async function instagram() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch {
        // Cancelled by the user: nothing to do.
        return;
      }
    }
    await copy("Link copied. Paste it in an Instagram DM, or add it to your Story with the link sticker.");
  }

  const btn = "btn btn-quiet btn-small gap-2";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <a
          className={btn}
          href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${link}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="#25D366">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          WhatsApp
        </a>
        <a
          className={btn}
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="#1877F2">
            <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
          </svg>
          Facebook
        </a>
        <button type="button" className={btn} onClick={instagram}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="#E1306C" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="#E1306C" stroke="none" />
          </svg>
          Instagram
        </button>
        <button type="button" className={btn} onClick={() => copy("Link copied.")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          Copy link
        </button>
      </div>
      {note && (
        <p role="status" className="text-sm text-muted">
          {note}
        </p>
      )}
    </div>
  );
}
