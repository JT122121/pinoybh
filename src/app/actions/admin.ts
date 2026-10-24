"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import type { CommentStatus, PostStatus } from "@/lib/types";

async function staffClient() {
  const viewer = await getViewer();
  if (!viewer?.isStaff) throw new Error("Only moderators can do this.");
  return createClient();
}

function note(formData: FormData) {
  return String(formData.get("note") ?? "").trim() || null;
}

async function run(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function setPostStatus(formData: FormData) {
  const supabase = await staffClient();
  await run(
    supabase.rpc("admin_set_post_status", {
      p_post: String(formData.get("post_id")),
      p_status: String(formData.get("status")) as PostStatus,
      p_note: note(formData),
    }),
  );
}

export async function setCommentStatus(formData: FormData) {
  const supabase = await staffClient();
  await run(
    supabase.rpc("admin_set_comment_status", {
      p_comment: String(formData.get("comment_id")),
      p_status: String(formData.get("status")) as CommentStatus,
      p_note: note(formData),
    }),
  );
}

export async function resolveReport(formData: FormData) {
  const supabase = await staffClient();
  await run(
    supabase.rpc("admin_resolve_report", {
      p_report: String(formData.get("report_id")),
      p_status: String(formData.get("status")),
      p_note: note(formData),
    }),
  );
}

export async function setBan(formData: FormData) {
  const supabase = await staffClient();
  await run(
    supabase.rpc("admin_set_ban", {
      p_user: String(formData.get("user_id")),
      p_banned: formData.get("banned") === "true",
      p_note: note(formData) ?? "",
    }),
  );
}

export async function reviewVerification(formData: FormData) {
  const supabase = await staffClient();
  await run(
    supabase.rpc("admin_review_verification", {
      p_request: String(formData.get("request_id")),
      p_approve: formData.get("approve") === "true",
      p_note: note(formData),
    }),
  );
}

export async function revokeVerification(formData: FormData) {
  const supabase = await staffClient();
  await run(supabase.rpc("admin_revoke_verification", { p_user: String(formData.get("user_id")), p_note: note(formData) }));
}

export async function addSynonymGroup(formData: FormData) {
  const supabase = await staffClient();
  const terms = String(formData.get("terms") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length < 2) throw new Error("Add at least two words, separated by commas.");
  await run(supabase.from("synonym_groups").insert({ terms }));
}

export async function deleteSynonymGroup(formData: FormData) {
  const supabase = await staffClient();
  await run(supabase.from("synonym_groups").delete().eq("id", Number(formData.get("id"))));
}

export async function addFlagTerm(formData: FormData) {
  const supabase = await staffClient();
  const term = String(formData.get("term") ?? "").trim().toLowerCase();
  const appliesTo = String(formData.get("applies_to") ?? "");
  if (term.length < 2) throw new Error("The word is too short.");
  await run(
    supabase.from("flag_terms").upsert({ term, applies_to: appliesTo === "listing" || appliesTo === "job" ? appliesTo : null }),
  );
}

export async function deleteFlagTerm(formData: FormData) {
  const supabase = await staffClient();
  await run(supabase.from("flag_terms").delete().eq("term", String(formData.get("term"))));
}
