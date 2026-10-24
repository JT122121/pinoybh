# Email templates

Paste these into Supabase once custom SMTP (Resend) is set up. Supabase only lets free projects edit templates when they use their own SMTP.

**Where:** Supabase > Authentication > Emails > Templates.

The links below go to `/auth/confirm` on the site. They work on any phone or computer and survive email apps that "preview" links. Without these templates, the site still works (it uses Supabase's default links), but the subject and wording are Supabase's.

Also set **Authentication > URL Configuration > Redirect URLs** to `https://YOUR-SITE/**` (with the two stars), so every page on the site is allowed as a destination.

---

## Confirm signup

**Subject:** `Confirm your PinoyBH account`

```html
<h2>Mabuhay, kabayan!</h2>
<p>Thanks for joining PinoyBH, the community marketplace and job board for Filipinos in Bahrain.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm my email</a></p>
<p>Then log in with your email and password.</p>
<p>If you didn't sign up, you can ignore this email.</p>
```

## Reset password

**Subject:** `Reset your PinoyBH password`

```html
<h2>Reset your password</h2>
<p>Someone (hopefully you) asked to reset the password for your PinoyBH account.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
<p>The link works once and expires in an hour. If you didn't ask for this, ignore this email. Your password stays the same.</p>
```

## Change email address

**Subject:** `Confirm your new email for PinoyBH`

```html
<h2>Confirm your new email</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change">Confirm this email address</a></p>
<p>If you didn't ask for this, ignore this email.</p>
```

**Sender name** (in the SMTP settings): `PinoyBH`
