import type { Post } from "./types";

const bhd = new Intl.NumberFormat("en-BH", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function formatPrice(post: Pick<Post, "kind" | "price_type" | "price_bhd">): string | null {
  if (post.kind !== "listing") return null;
  if (post.price_type === "free") return "Free";
  if (post.price_bhd == null) return "Make an offer";
  const amount = `BD ${bhd.format(Number(post.price_bhd))}`;
  return post.price_type === "negotiable" ? `${amount}, negotiable` : amount;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function mediaUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

export function whatsappLink(value: string): string {
  return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
}

/** Returns a same-site path, or the fallback. Stops open redirects via ?next=. */
export function safeNext(next: unknown, fallback = "/"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
