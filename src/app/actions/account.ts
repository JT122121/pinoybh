"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import { AREAS } from "@/lib/constants";
import type { FormState } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again." };
  const displayName = String(formData.get("display_name") ?? "").trim();
  const area = String(formData.get("area") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();
  const avatar = String(formData.get("avatar_path") ?? "");
  if (displayName.length < 2 || displayName.length > 40) return { error: "Your name should be 2 to 40 characters." };
  if (avatar && !avatar.startsWith(`${viewer.userId}/avatar/`)) return { error: "That photo could not be saved." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      area: (AREAS as readonly string[]).includes(area) ? area : null,
      bio: bio.slice(0, 300) || null,
      avatar_path: avatar || null,
    })
    .eq("id", viewer.userId);
  const message = friendlyDbError(error, "We could not save your profile.");
  if (message) return { error: message };
  if (viewer.profile.avatar_path && viewer.profile.avatar_path !== avatar) {
    await supabase.storage.from("media").remove([viewer.profile.avatar_path]);
  }
  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

export async function requestVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again." };
  const socialUrl = String(formData.get("social_url") ?? "").trim();
  const rawMobile = String(formData.get("ph_mobile") ?? "").replace(/[\s-]/g, "");
  // Accept 09171234567, 9171234567 or +639171234567.
  const mobile = rawMobile ? rawMobile.replace(/^(?:\+?63|0)?(9\d{9})$/, "+63$1") : "";
  if (!/^https:\/\//i.test(socialUrl)) return { error: "Paste the full link to your profile, starting with https://" };
  if (mobile && !/^\+639\d{9}$/.test(mobile)) return { error: "That doesn't look like a Philippine mobile number. Leave it empty if you prefer." };

  const supabase = await createClient();
  const { error } = await supabase.from("verification_requests").insert({
    user_id: viewer.userId,
    social_url: socialUrl,
    ph_mobile: mobile || null,
  });
  if (error?.code === "23505") return { error: "You already have a request waiting for review." };
  const message = friendlyDbError(error, "We could not send your request.");
  if (message) return { error: message };
  revalidatePath("/account");
  return { success: "Request sent. Put your code in your profile bio so a moderator can check it." };
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again." };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: 'Type DELETE in the box to confirm.' };
  }
  const supabase = await createClient();

  // Remove photos first. Database rows go with the account.
  const { data: photos } = await supabase
    .from("post_photos")
    .select("path, posts!inner(author_id)")
    .eq("posts.author_id", viewer.userId);
  const paths = (photos ?? []).map((p) => p.path);
  if (viewer.profile.avatar_path) paths.push(viewer.profile.avatar_path);
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("media").remove(paths.slice(i, i + 100));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "We could not delete your account. Please try again." };
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
