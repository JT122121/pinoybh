"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/format";
import type { FormState } from "@/lib/types";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const area = String(formData.get("area") ?? "");
  const agreed = formData.get("rules_agreed") === "on";

  if (!agreed) return { error: "Please tick the community box to join." };
  if (displayName.length < 2 || displayName.length > 40) return { error: "Your name should be 2 to 40 characters." };
  if (password.length < 8) return { error: "Your password needs at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, area, rules_agreed: true },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/account`,
    },
  });
  if (error) {
    if (/already registered/i.test(error.message)) return { error: "That email already has an account. Try logging in." };
    return { error: "We could not create your account. Check your email address and try again." };
  }
  // Projects with email confirmation off get a session straight away.
  if (data.session) redirect("/account");
  return { success: "Almost there! We sent you an email. Open the link inside to confirm your account." };
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (/banned/i.test(error.message)) redirect("/banned");
    if (/not confirmed/i.test(error.message)) return { error: "Please confirm your email first. Check your inbox for our link." };
    return { error: "Wrong email or password." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? "").trim(), {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });
  // Same answer either way, so nobody can check which emails have accounts.
  return { success: "If that email has an account, we sent a link to reset your password." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Your password needs at least 8 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "The reset link has expired. Ask for a new one." };
  redirect("/account");
}
