import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * For custom email templates (docs/email-templates.md):
 *   /auth/confirm?token_hash={{ .TokenHash }}&type=signup
 *   /auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * Works on any device and survives email scanners better than the default links.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(type === "recovery" ? `${origin}/reset-password#error=expired` : `${origin}/login?error=link`);
  }
  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
