"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import { AREAS, JOB_TYPES, MAX_PHOTOS } from "@/lib/constants";
import type { ContactMethod, FormState, JobType, PostKind, PriceType } from "@/lib/types";
import { getViewer } from "@/lib/viewer";
import { fromBahrainInputs, normalizePhone } from "@/lib/format";
import { isPostKind } from "@/lib/kinds";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readPost(formData: FormData) {
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const kind = text("kind") as PostKind;
  const jobType = (text("job_type") || null) as JobType | null;
  const priceType = (text("price_type") || null) as PriceType | null;
  const price = text("price_bhd");
  const area = text("area");
  return {
    id: text("id"),
    kind,
    category: kind === "job" ? (JOB_TYPES.find((j) => j.value === jobType)?.category ?? "") : text("category"),
    job_type: kind === "job" ? jobType : null,
    title: text("title"),
    description: text("description"),
    price_type: kind === "listing" || kind === "event" ? priceType : null,
    price_bhd: (kind === "listing" || kind === "event") && priceType !== "free" && price !== "" ? Number(price) : null,
    area: (AREAS as readonly string[]).includes(area) ? area : null,
    reference_url: jobType === "referral" ? text("reference_url") || null : null,
    own_post_confirmed: kind === "job" && formData.get("own_post_confirmed") === "on",
    sponsorship_confirmed: jobType === "household" && formData.get("sponsorship_confirmed") === "on",
    contact: contactFrom(text("contact_method") as ContactMethod, text("contact_value")),
    photos: formData.getAll("photo").map(String).slice(0, MAX_PHOTOS),
    event_starts_at: kind === "event" ? fromBahrainInputs(text("event_date"), text("event_start")) : null,
    event_ends_at: kind === "event" && text("event_end") ? endTime(text("event_date"), text("event_start"), text("event_end")) : null,
    venue: kind === "event" ? text("venue").slice(0, 120) || null : null,
    map_url: kind === "event" ? text("map_url") || null : null,
  };
}

/** Emails are lower-cased; numbers are put in international form (see normalizePhone). */
function contactFrom(method: ContactMethod, raw: string): { method: ContactMethod; value: string } {
  if (method === "email") return { method, value: raw.toLowerCase() };
  return { method, value: raw ? normalizePhone(raw) : "" };
}

/** End time on the same day, or the next day if it's earlier than the start (e.g. 8 PM to 1 AM). */
function endTime(date: string, start: string, end: string): string | null {
  const s = fromBahrainInputs(date, start);
  const e = fromBahrainInputs(date, end);
  if (!s || !e) return null;
  return e > s ? e : new Date(new Date(e).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

const MAPS_URL = /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

function validate(p: ReturnType<typeof readPost>, userId: string): string | null {
  if (!UUID.test(p.id)) return "Something went wrong. Reload the page and try again.";
  if (!isPostKind(p.kind)) return "Choose what you want to post.";
  if (p.kind === "event") {
    if (!p.category) return "Choose what kind of event this is.";
    if (!p.event_starts_at) return "Choose the date and start time.";
    if (!p.venue || p.venue.length < 2) return "Add the venue, e.g. a hall, park or church name.";
    if (p.map_url && !MAPS_URL.test(p.map_url)) return "The map link must be a Google Maps link (share the place from Google Maps).";
    if (!p.price_type) return "Choose Free or Pay at the door.";
  }
  if (p.kind === "job" && !p.job_type) return "Choose the kind of job post.";
  if (p.kind === "listing" && !p.category) return "Choose a category.";
  if (p.title.length < 5 || p.title.length > 100) return "The title should be 5 to 100 characters.";
  if (p.description.length < 10) return "Add a few more words to the description.";
  if (p.kind === "listing" && !p.price_type) return "Choose a price option.";
  if (p.kind === "event" && p.price_type === "negotiable") return "Choose Free or Pay at the door.";
  if (p.price_type === "fixed" && (p.price_bhd == null || !Number.isFinite(p.price_bhd) || p.price_bhd < 0)) return "Enter the price in BD.";
  if (p.kind === "job" && !p.own_post_confirmed) return "Please tick the box to confirm this is your own post and nobody pays a fee.";
  if (p.job_type === "referral" && !/^https?:\/\//i.test(p.reference_url ?? "")) return "Add a link to the official job listing (starting with https://).";
  if (p.job_type === "household" && !p.sponsorship_confirmed) return "Please confirm the job has proper sponsorship.";
  if (p.contact.value && !["whatsapp", "phone", "email"].includes(p.contact.method)) return "Choose how people should contact you.";
  if (p.contact.value && p.contact.method === "email" && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(p.contact.value))
    return "Enter a full email address, like name@gmail.com.";
  if (p.contact.value && p.contact.method !== "email" && !/^\+\d{8,15}$/.test(p.contact.value))
    return "Enter a phone number with digits only, like +973 3312 3456 or +63 917 123 4567.";
  // Photos must be inside this member's folder for this post.
  const prefix = `${userId}/${p.id}/`;
  if (p.photos.some((path) => !path.startsWith(prefix) || path.includes(".."))) return "One of the photos could not be saved. Remove it and try again.";
  return null;
}

export async function savePost(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again." };
  const p = readPost(formData);
  const problem = validate(p, viewer.userId);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const isEdit = formData.get("mode") === "edit";
  const fields = {
    title: p.title,
    description: p.description,
    price_type: p.price_type,
    price_bhd: p.price_bhd,
    area: p.area,
    reference_url: p.reference_url,
    own_post_confirmed: p.own_post_confirmed,
    sponsorship_confirmed: p.sponsorship_confirmed,
    event_starts_at: p.event_starts_at,
    event_ends_at: p.event_ends_at,
    venue: p.venue,
    map_url: p.map_url,
  };

  const { error } = isEdit
    ? await supabase.from("posts").update(fields).eq("id", p.id).eq("author_id", viewer.userId)
    : await supabase.from("posts").insert({ ...fields, id: p.id, author_id: viewer.userId, kind: p.kind, category: p.category, job_type: p.job_type });
  const message = friendlyDbError(error, "We could not save your post. Check the details and try again.");
  if (message) return { error: message };

  if (p.contact.value) {
    await supabase.from("post_contacts").upsert({ post_id: p.id, method: p.contact.method, value: p.contact.value.slice(0, 100) });
  } else {
    await supabase.from("post_contacts").delete().eq("post_id", p.id);
  }

  // Sync photos: keep the order from the form.
  const { data: existing } = await supabase.from("post_photos").select("id, path").eq("post_id", p.id);
  const removed = (existing ?? []).filter((e) => !p.photos.includes(e.path));
  if (removed.length) {
    await supabase.from("post_photos").delete().in("id", removed.map((r) => r.id));
    await supabase.storage.from("media").remove(removed.map((r) => r.path));
  }
  const kept = new Map((existing ?? []).map((e) => [e.path, e.id]));
  for (const [position, path] of p.photos.entries()) {
    if (kept.has(path)) {
      await supabase.from("post_photos").update({ position }).eq("id", kept.get(path)!);
    } else {
      await supabase.from("post_photos").insert({ post_id: p.id, path, position });
    }
  }

  revalidatePath("/", "layout");
  redirect(`/posts/${p.id}`);
}

async function setOwnStatus(formData: FormData, status: "closed" | "active") {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("posts").update({ status }).eq("id", id).eq("author_id", viewer.userId);
  revalidatePath("/", "layout");
}

export async function closePost(formData: FormData) {
  await setOwnStatus(formData, "closed");
}

export async function reopenPost(formData: FormData) {
  await setOwnStatus(formData, "active");
}

export async function deletePost(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: photos } = await supabase.from("post_photos").select("path").eq("post_id", id);
  const { error } = await supabase.from("posts").delete().eq("id", id).eq("author_id", viewer.userId);
  if (!error && photos?.length) await supabase.storage.from("media").remove(photos.map((p) => p.path));
  revalidatePath("/", "layout");
  redirect("/account");
}

/** Going / Interested, or remove your answer. */
export async function setRsvp(formData: FormData) {
  const viewer = await getViewer();
  const postId = String(formData.get("post_id") ?? "");
  if (!viewer) redirect(`/login?next=/posts/${postId}`);
  if (!UUID.test(postId)) return;
  const status = String(formData.get("status") ?? "");
  const supabase = await createClient();
  if (status === "going" || status === "interested") {
    const { data: existing } = await supabase.from("event_rsvps").select("status").eq("post_id", postId).maybeSingle();
    if (existing) {
      await supabase.from("event_rsvps").update({ status }).eq("post_id", postId).eq("user_id", viewer.userId);
    } else {
      await supabase.from("event_rsvps").insert({ user_id: viewer.userId, post_id: postId, status });
    }
  } else {
    await supabase.from("event_rsvps").delete().eq("post_id", postId).eq("user_id", viewer.userId);
  }
  revalidatePath(`/posts/${postId}`);
}
