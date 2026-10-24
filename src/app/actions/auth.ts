"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/format";
import { configuredSiteUrl } from "@/lib/site";
import { createLinkClient } from "@/lib/supabase/implicit";
import type { FormState } from "@/lib/types";

/** Turnstile token from the form; Supabase checks it when CAPTCHA is on. */
function captchaToken(formData: FormData): string | undefined {
  return String(formData.get("cf-turnstile-response") ?? "") || undefined;
}

function isCaptchaError(message: string) {
  return /captcha/i.test(message);
}

const CAPTCHA_MESSAGE = "Please complete the check that you're a person, then try again.";

async function siteUrl() {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function isRateLimit(error: { status?: number; message: string }) {
  return error.status === 429 || /rate limit|after \d+ seconds|security purposes/i.test(error.message);
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

  const { data, error } = await createLinkClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, area, rules_agreed: true },
      // The confirmation link lands on the login page, on any device.
      emailRedirectTo: `${await siteUrl()}/login?confirmed=1`,
      captchaToken: captchaToken(formData),
    },
  });
  if (error) {
    if (isCaptchaError(error.message)) return { error: CAPTCHA_MESSAGE };
    if (/already registered/i.test(error.message)) return { error: "That email already has an account. Try logging in." };
    if (isRateLimit(error)) return { error: "We can't send any more confirmation emails right now. Please try again in about an hour." };
    return { error: "We could not create your account. Check your email address and try again." };
  }
  // Projects with email confirmation off get a session straight away.
  if (data.session) {
    const supabase = await createClient();
    await supabase.auth.setSession(data.session);
    redirect("/account");
  }
  return { success: `Almost there! We sent a link to ${email}. Open it on any device to confirm your account, then log in.` };
}

export async function resendConfirmation(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };
  const { error } = await createLinkClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteUrl()}/login?confirmed=1`, captchaToken: captchaToken(formData) },
  });
  if (error && isCaptchaError(error.message)) return { error: CAPTCHA_MESSAGE };
  if (error && isRateLimit(error)) return { error: "Please wait a minute before asking for another email." };
  // Same answer whether or not the email has an account.
  return { success: "If that email is waiting for confirmation, we sent a new link. Check your inbox and spam folder." };
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    options: { captchaToken: captchaToken(formData) },
  });
  if (error) {
    if (isCaptchaError(error.message)) return { error: CAPTCHA_MESSAGE };
    if (/banned/i.test(error.message)) redirect("/banned");
    if (/not confirmed/i.test(error.message)) return { error: "Please confirm your email first. Check your inbox for our link.", needsConfirmation: true };
    return { error: "Wrong email or password." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const { error } = await createLinkClient().auth.resetPasswordForEmail(String(formData.get("email") ?? "").trim(), {
    redirectTo: `${await siteUrl()}/reset-password`,
    captchaToken: captchaToken(formData),
  });
  if (error && isCaptchaError(error.message)) return { error: CAPTCHA_MESSAGE };
  if (error && isRateLimit(error)) return { error: "We just sent you a link. Please wait a minute before asking for another one." };
  // Same answer either way, so nobody can check which emails have accounts.
  return { success: "If that email has an account, we sent a link to reset your password. You can open it on any device." };
}

/** Sets a new password after following the reset link, then asks the member to log in again. */
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Your password needs at least 8 characters." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/should be different/i.test(error.message)) return { error: "Choose a password you haven't used here before." };
    return { error: "Your reset link has expired. Ask for a new one." };
  }
  // Log out everywhere, including any device that knew the old password.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?reset=1");
}

/** Change password while logged in: checks the current one first. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Your new password needs at least 8 characters." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords don't match." };
  if (password === current) return { error: "The new password is the same as the current one." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  if (!email) return { error: "Please log in again." };
  // Check the current password without touching this browser's login.
  const check = await createLinkClient().auth.signInWithPassword({ email, password: current });
  if (check.error) return { error: "Your current password is wrong." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We could not change your password. Please try again." };
  // Other devices that knew the old password are logged out.
  await supabase.auth.signOut({ scope: "others" });
  return { success: "Password changed. Other devices have been logged out." };
}
