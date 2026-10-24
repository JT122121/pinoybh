import type { Post } from "./types";

const bhd = new Intl.NumberFormat("en-BH", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function formatPrice(post: Pick<Post, "kind" | "price_type" | "price_bhd">): string | null {
  if (post.kind === "event") {
    if (post.price_type === "free" || post.price_bhd == null) return "Free";
    return `BD ${bhd.format(Number(post.price_bhd))} at the door`;
  }
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

// Bahrain is UTC+3 all year (no daylight saving).
const TZ = "Asia/Bahrain";
const eventDay = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const eventTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "Sat 12 Nov, 7:00 PM to 10:00 PM" in Bahrain time. */
export function formatEventWhen(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  const text = `${eventDay.format(start)}, ${eventTime.format(start)}`;
  if (!endsAt) return text;
  const end = new Date(endsAt);
  return dayKey.format(start) === dayKey.format(end)
    ? `${text} to ${eventTime.format(end)}`
    : `${text} to ${eventDay.format(end)}, ${eventTime.format(end)}`;
}

/** Splits a stored time into the date and time inputs' values, in Bahrain time. */
export function toBahrainInputs(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const shifted = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** The date and time inputs (entered in Bahrain time) as an ISO timestamp. */
export function fromBahrainInputs(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
