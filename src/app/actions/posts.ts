"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import { AREAS, JOB_TYPES, MAX_PHOTOS } from "@/lib/constants";
import type { ContactMethod, FormState, JobType, PostKind, PriceType } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

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
    price_type: kind === "listing" ? priceType : null,
    price_bhd: kind === "listing" && priceType !== "free" && price !== "" ? Number(price) : null,
    area: (AREAS as readonly string[]).includes(area) ? area : null,
    reference_url: jobType === "referral" ? text("reference_url") || null : null,
    own_post_confirmed: kind === "job" && formData.get("own_post_confirmed") === "on",
    sponsorship_confirmed: jobType === "household" && formData.get("sponsorship_confirmed") === "on",
    contact: { method: text("contact_method") as ContactMethod, value: text("contact_value") },
    photos: formData.getAll("photo").map(String).slice(0, MAX_PHOTOS),
  };
}

function validate(p: ReturnType<typeof readPost>, userId: string): string | null {
  if (!UUID.test(p.id)) return "Something went wrong. Reload the page and try again.";
  if (p.kind !== "listing" && p.kind !== "job") return "Choose what you want to post.";
  if (p.kind === "job" && !p.job_type) return "Choose the kind of job post.";
  if (p.kind === "listing" && !p.category) return "Choose a category.";
  if (p.title.length < 5 || p.title.length > 100) return "The title should be 5 to 100 characters.";
  if (p.description.length < 10) return "Add a few more words to the description.";
  if (p.kind === "listing" && !p.price_type) return "Choose a price option.";
  if (p.price_type === "fixed" && (p.price_bhd == null || !Number.isFinite(p.price_bhd) || p.price_bhd < 0)) return "Enter the price in BD.";
  if (p.kind === "job" && !p.own_post_confirmed) return "Please tick the box to confirm this is your own post and nobody pays a fee.";
  if (p.job_type === "referral" && !/^https?:\/\//i.test(p.reference_url ?? "")) return "Add a link to the official job listing (starting with https://).";
  if (p.job_type === "household" && !p.sponsorship_confirmed) return "Please confirm the job has proper sponsorship.";
  if (p.contact.value && !["whatsapp", "phone", "email"].includes(p.contact.method)) return "Choose how people should contact you.";
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
