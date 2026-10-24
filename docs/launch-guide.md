# Launch guide

From an empty Supabase account to a live site you've tried to break yourself. Do the phases in order. Each one ends with a check. Don't move on until the check passes.

Rough time: one evening for phases 1–6, another for phase 7.

## What you need first

| Account | What for | Cost |
|---|---|---|
| GitHub | The code (you have this) | Free |
| [Supabase](https://supabase.com) | Database, logins, photos | Free to start, ~$25/month before launch |
| [Vercel](https://vercel.com) | Runs the website | Free (Hobby) |
| [Cloudflare](https://dash.cloudflare.com) | CAPTCHA (Turnstile), and you can buy a domain here | Free; a domain is ~$10–15/year |
| [Resend](https://resend.com) | Sends sign-up and password emails | Free plan is enough to start |
| A domain, e.g. `pinoybh.com` | Needed to send email to members, and looks trustworthy | ~$10–15/year |

Sign up for Vercel with your GitHub account. That makes step 3 one click.

---

## Phase 1: Put the code on `main`

Vercel publishes the `main` branch. The app is on `v1-build`, so merge it: on GitHub, open a pull request from `v1-build` into `main` and merge it.

**Check:** on GitHub, `main` shows the `src/` and `supabase/` folders.

## Phase 2: Create the Supabase project

1. In Supabase, click **New project**.
   - Name: `pinoybh`
   - Database password: click **Generate**, then save it in your password manager. You rarely need it, but you can't get it back.
   - Region: the one closest to Bahrain (Mumbai or Frankfurt).
   - If you see Data API options, keep the Data API **on**. The other "expose tables" setting can be left as it is: the database setup grants exactly what the site needs either way.
2. Wait until the project says it's ready.
3. Open **SQL Editor** > **New query**. Open `supabase/migrations/20261024000001_init.sql` on GitHub, click **Raw**, copy everything, paste it, and click **Run**. If Supabase warns about destructive operations, that's the `revoke` lines removing default access. Confirm.
4. New query again. Do the same with `supabase/migrations/20261024000002_storage.sql`.

Run each file **once**, on a fresh project. Running the first one twice fails with "already exists". That's harmless, but don't edit and re-run bits of it.

**Check:** in a new query, run

```sql
select count(*) from public.categories;
```

It should say **14**. Also open **Storage**: there should be a public bucket called `media`.

## Phase 3: Deploy to Vercel

1. In Supabase, click **Connect** (top of the project) or go to **Settings > API Keys**. Copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **publishable key** (starts with `sb_publishable_`). Never use the **secret** key in the website.
2. In Vercel: **Add New > Project**, pick the `pinoybh` repo, then open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
   | `NEXT_PUBLIC_SITE_URL` | leave for now (see step 4) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | the email members should write to |

3. Click **Deploy**. Vercel gives you an address like `https://pinoybh-abc.vercel.app`.
4. Add `NEXT_PUBLIC_SITE_URL` = that address (or your own domain, once connected). Then **Deployments > ... > Redeploy**. You must redeploy after changing any `NEXT_PUBLIC_` value; it's baked in when the site is built.

**Check:** the address shows "Mabuhay, Kabayan!" and the Marketplace page loads (empty).

## Phase 4: Point Supabase logins at the site

In Supabase, **Authentication > URL Configuration**:

- **Site URL:** your site address, e.g. `https://pinoybh-abc.vercel.app`
- **Redirect URLs:** add `https://pinoybh-abc.vercel.app/auth/callback`

In **Authentication > Sign In / Providers > Email**, keep **Confirm email** on.

## Phase 5: Email that actually reaches members

Supabase's built-in email only delivers to people on **your Supabase team**, and only a couple per hour. Anyone else gets "Email address not authorized" and can never confirm their account or reset a password. This step is not optional.

1. Buy your domain (Cloudflare Registrar is the simplest if you'll use Cloudflare anyway).
2. In Resend, **Domains > Add domain**, and add the DNS records it shows you at your domain provider. Wait until Resend says **Verified**.
3. In Resend, create an **API key**.
4. In Supabase, open the **SMTP settings** under Authentication (Emails) and turn on custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key
   - Sender email: e.g. `no-reply@yourdomain.com`; sender name: `PinoyBH`
5. Optional but worth it: connect the domain to Vercel (**Project > Settings > Domains**). Then update the Site URL, the Redirect URL, and `NEXT_PUBLIC_SITE_URL` to the new address, and redeploy.

**Check:** sign up on the site with your email. The confirmation email arrives, and the link logs you in.

## Phase 6: Make yourself admin, then turn on CAPTCHA

**Admin:** after confirming your account, run in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOUR@EMAIL');
```

Reload the site. You now see **Admin** in the header.

**CAPTCHA:** do both halves in one sitting. Supabase with CAPTCHA on and no CAPTCHA on the site = nobody can sign up or log in.

1. In Cloudflare: **Turnstile > Add widget**. Hostnames: your Vercel address and your domain. Mode: **Managed**. You get a **site key** and a **secret key**.
2. In Supabase, **Authentication > Attack Protection**: turn on CAPTCHA, choose **Turnstile**, paste the **secret key**, save.
3. In Vercel, add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the **site key**, and redeploy.

**Check:** log out, then log in. You see the Cloudflare check above the button, and login works.

---

## Phase 7: Try to break it

Make three test accounts. With Gmail you can use one inbox: `you+cora@gmail.com`, `you+dan@gmail.com`, `you+eli@gmail.com` all arrive in your inbox. Use a private/incognito window for each extra account.

Tick each line only when the result matches **Expected**.

### Accounts

| Try this | Expected |
|---|---|
| Sign up without ticking the community box | The form won't submit |
| In Supabase, **Authentication > Users > Add user** | Fails with a database error. Good: even the dashboard can't skip the community checkbox |
| Forgot password, from a test account | Email arrives; link lets you set a new password |
| Log in with a wrong password | "Wrong email or password." |

### Posting rules

| Try this | Expected |
|---|---|
| Post a listing with 2 photos taken on your phone | Goes live; photos show; first photo is the thumbnail |
| Post a job saying "pay the processing fee first" | Shows "Waiting for review"; not visible in Jobs from another account |
| Edit a live listing to add "money transfer to PH" | Goes back to "Waiting for review" |
| New account: make a 4th post in its first week | Blocked with a clear message |
| Have 2 job posts, try a 3rd | Blocked: "You can have up to 2 active job posts" |
| "My company is hiring" without a link | Blocked |
| "My household is hiring" without ticking sponsorship | Blocked |
| Add a 7th photo | Not allowed |

### Privacy

| Try this | Expected |
|---|---|
| Logged out, open a post | "Log in to contact", no phone number. Also right-click > **View page source**, search for the number: not there |
| Cora follows Ben. Log in as Ben | Ben sees "1 member follows you", never who |
| Ben blocks Cora. Log in as Cora | Ben's posts are gone for Cora; she can't follow him again. Then unblock her (Ben: **My account > Blocked members**) so she can help with the next tests |

### Moderation

Reports only auto-hide a post when they come from accounts at least 3 days old, so age your test accounts first (SQL Editor):

```sql
update public.profiles set created_at = now() - interval '4 days'
where display_name in ('Cora', 'Dan', 'Eli');
```

| Try this | Expected |
|---|---|
| Report with "Not part of the community" and no explanation | The form asks for an explanation |
| Cora, Dan and Eli each report one of Ben's posts | After the third report the post disappears for everyone except Ben and admins |
| As admin, **Admin > Reports**: "Post is fine, keep it live" | Post is back; its reports are cleared |
| As admin, **Admin > Review queue**: approve the "processing fee" job | It goes live; followers get a notification |
| Cora asks for Verified Kabayan (**My account**) | She gets a KABAYAN-XXXXXX code. In **Admin > Verification** you see her link and the code to look for. Approve: the badge shows on her posts |
| Ban Eli (with a reason) | Eli is logged out on the next click and can't log back in; Eli's posts disappear |
| **Admin > Action log** | Every action above is listed with your name and reason |

### Direct attacks (paste into a browser address bar)

Replace `PROJECT` and `KEY` with your Project URL and publishable key. These skip the website and talk to the database directly, the way an attacker would.

| Paste this | Expected |
|---|---|
| `https://PROJECT.supabase.co/rest/v1/post_contacts?select=*&apikey=KEY` | An error ("permission denied"). Phone numbers are never readable without logging in |
| `https://PROJECT.supabase.co/rest/v1/follows?select=*&apikey=KEY` | Permission denied |
| `https://PROJECT.supabase.co/rest/v1/verification_requests?select=*&apikey=KEY` | Permission denied |
| `https://PROJECT.supabase.co/rest/v1/posts?select=title&status=eq.pending_review&apikey=KEY` | `[]`, an empty list |
| `https://PROJECT.supabase.co/rest/v1/profiles?select=*&apikey=KEY` | Names, areas, badge status. **No emails, no phone numbers.** If you ever see an email here, stop and tell me |

### On a real phone, on mobile data

| Try this | Expected |
|---|---|
| Whole flow: join, post with a camera photo, search "kasambahay" | Works; upload doesn't take forever (photos are shrunk first) |
| Tap the WhatsApp button on someone's post | Opens WhatsApp with their number |

Write down anything that surprised you, even small things. Those are the bugs.

---

## Phase 8: Before you invite anyone

1. Supabase **paid plan**. Free projects pause after a week without visits, and the site goes down.
2. A Bahrain lawyer or LMRA checks the job and marketplace rules (`SPEC.md` sections 6, 7, 14) and the Privacy page.
3. Decide who moderates, and when. Check **Admin > Overview** every day.
4. Delete your test accounts (each one: **My account > Delete account**), and set the real contact email.
5. Start small: 20–30 people you know. Watch the report queue for two weeks before posting it in big Facebook groups.
