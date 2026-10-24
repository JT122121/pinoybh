import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export interface Viewer {
  userId: string;
  email: string | undefined;
  profile: Profile;
  isStaff: boolean;
}

/** The logged-in member for this request, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  // Verified login token (checked locally where possible, see middleware).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (!profile || profile.is_banned) return null;
  return {
    userId,
    email: typeof data?.claims?.email === "string" ? data.claims.email : undefined,
    profile,
    isStaff: profile.role === "moderator" || profile.role === "admin",
  };
});

export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}
