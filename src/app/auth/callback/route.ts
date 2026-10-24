import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/format";

/**
 * Older links (and future sign-in providers) arrive here with a one-time code.
 * Email confirmations go to the login page; password resets to the
 * new-password page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (searchParams.get("error_code") || searchParams.get("error") || !code) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);

  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as { method?: string }[];
  if (amr.some((a) => a.method === "recovery")) return NextResponse.redirect(`${origin}/reset-password`);
  const next = searchParams.get("next");
  if (next) return NextResponse.redirect(`${origin}${safeNext(next)}`);
  // Sign-up confirmation: show the login page, as members expect.
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
