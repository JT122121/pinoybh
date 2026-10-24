import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A short-lived client for email links (sign-up confirmation and password
 * reset) and for checking a password without touching the visitor's login.
 *
 * It uses Supabase's "implicit" link flow, which works when the email is
 * opened on a different phone or computer than the one that asked for it.
 * (The default flow only works in the same browser.)
 */
export function createLinkClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
