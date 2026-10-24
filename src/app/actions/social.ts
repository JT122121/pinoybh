"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { safeNext } from "@/lib/format";
import type { FormState, PostKind, ReportReason } from "@/lib/types";
import { REPORT_REASONS } from "@/lib/constants";
import { friendlyDbError } from "@/lib/errors";
import { isPostKind } from "@/lib/kinds";

async function viewerOrLogin(back: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(back)}`);
  return viewer;
}

export async function followMember(formData: FormData) {
  const back = safeNext(formData.get("back"));
  const viewer = await viewerOrLogin(back);
  const supabase = await createClient();
  await supabase.from("follows").insert({ follower_id: viewer.userId, followed_user_id: String(formData.get("user_id")) });
  revalidatePath(back);
}

export async function followCategory(formData: FormData) {
  const back = safeNext(formData.get("back"));
  const viewer = await viewerOrLogin(back);
  const supabase = await createClient();
  await supabase.from("follows").insert({ follower_id: viewer.userId, category_slug: String(formData.get("category")) });
  revalidatePath(back);
}

export async function followSearch(formData: FormData) {
  const back = safeNext(formData.get("back"));
  const viewer = await viewerOrLogin(back);
  const kind = String(formData.get("kind") ?? "");
  const supabase = await createClient();
  await supabase.from("follows").insert({
    follower_id: viewer.userId,
    search_query: String(formData.get("q") ?? "").trim().slice(0, 80),
    search_kind: isPostKind(kind) ? kind : null,
  });
  revalidatePath(back);
}

export async function unfollow(formData: FormData) {
  const back = safeNext(formData.get("back"));
  await viewerOrLogin(back);
  const supabase = await createClient();
  await supabase.from("follows").delete().eq("id", String(formData.get("follow_id")));
  revalidatePath(back);
}

export async function blockMember(formData: FormData) {
  const back = safeNext(formData.get("back"));
  const viewer = await viewerOrLogin(back);
  const supabase = await createClient();
  await supabase.from("blocks").insert({ blocker_id: viewer.userId, blocked_id: String(formData.get("user_id")) });
  revalidatePath("/", "layout");
  redirect(back);
}

export async function unblockMember(formData: FormData) {
  const back = safeNext(formData.get("back"));
  const viewer = await viewerOrLogin(back);
  const supabase = await createClient();
  await supabase.from("blocks").delete().eq("blocker_id", viewer.userId).eq("blocked_id", String(formData.get("user_id")));
  revalidatePath("/", "layout");
}

export async function sendReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in to report." };
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const details = String(formData.get("details") ?? "").trim();
  const meta = REPORT_REASONS.find((r) => r.value === reason);
  if (!meta) return { error: "Choose a reason." };
  if (meta.needsDetails && details.length < 10) {
    return { error: "Please explain what is wrong in at least a sentence." };
  }

  const postId = formData.get("post_id");
  const profileId = formData.get("profile_id");
  const commentId = formData.get("comment_id");
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.userId,
    post_id: postId ? String(postId) : null,
    profile_id: profileId ? String(profileId) : null,
    comment_id: commentId ? String(commentId) : null,
    reason,
    details: details || null,
  });
  if (error?.code === "23505") return { success: "You already reported this. A moderator will look at it." };
  const message = friendlyDbError(error, "We could not send your report. Please try again.");
  if (message) return { error: message };
  return { success: "Thank you. A moderator will look at this soon." };
}

export async function markAllRead() {
  const viewer = await viewerOrLogin("/notifications");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.userId).is("read_at", null);
  revalidatePath("/", "layout");
}
