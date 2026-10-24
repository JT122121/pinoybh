"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in to comment." };
  const postId = String(formData.get("post_id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(postId) || (parentId && !UUID.test(parentId))) return { error: "Something went wrong. Reload the page." };
  if (!body) return { error: "Write something first." };
  if (body.length > 1000) return { error: "Comments can be up to 1000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: viewer.userId, parent_id: parentId || null, body })
    .select("status")
    .single();
  const message = friendlyDbError(error, "We could not post your comment. Please try again.");
  if (message) return { error: message };
  revalidatePath(`/posts/${postId}`);
  if (data?.status === "pending_review") {
    return { success: "Your comment is waiting for a moderator because it mentions fees, visas or similar words." };
  }
  return { success: "Posted." };
}

export async function editComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again." };
  const id = String(formData.get("comment_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(id)) return { error: "Something went wrong. Reload the page." };
  if (!body) return { error: "Write something first." };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").update({ body }).eq("id", id).eq("author_id", viewer.userId);
  const message = friendlyDbError(error, "We could not save your changes.");
  if (message) return { error: message };
  revalidatePath(`/posts/${postId}`);
  return { success: "Saved." };
}

export async function deleteComment(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) return;
  const id = String(formData.get("comment_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const supabase = await createClient();
  // RLS allows the comment's author, the post's owner and moderators.
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/posts/${postId}`);
}

/** "Turn off / on notifications for this post." */
export async function setPostMuted(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) return;
  const postId = String(formData.get("post_id") ?? "");
  if (!UUID.test(postId)) return;
  const supabase = await createClient();
  if (formData.get("muted") === "true") {
    // Plain insert: members can't update mutes, and a duplicate just means it's already off.
    await supabase.from("post_mutes").insert({ user_id: viewer.userId, post_id: postId });
  } else {
    await supabase.from("post_mutes").delete().eq("user_id", viewer.userId).eq("post_id", postId);
  }
  revalidatePath(`/posts/${postId}`);
}
