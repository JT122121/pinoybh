# PinoyBH

A community marketplace and job board for Filipinos in Bahrain.

Members post for themselves (no businesses, agencies or recruiters): things to sell or give away, bedspaces, balikbayan box space, and jobs. The full product spec is in [SPEC.md](SPEC.md).

## How it's built

- **Next.js 15** (App Router, TypeScript, Tailwind CSS 4), hosted on **Vercel**.
- **Supabase**: Postgres database, logins, and photo storage.
- The trust & safety rules live **in the database**, not only in the app: the sign-up checkbox, post limits, words that send a post to review, contact details hidden from visitors, private follower lists, auto-hide after reports, bans, and the Verified Kabayan badge. They hold even if someone talks to Supabase directly.

```
supabase/migrations/   database schema, rules and permissions
supabase/tests/        82 tests for the trust & safety rules (npm run test:db)
src/app/               pages and server actions
src/components/        shared UI
src/content/rules.ts   the community rules text
```

## Set it up

The full click-by-click guide, including how to test it afterwards, is in [docs/launch-guide.md](docs/launch-guide.md). Short version:

1. **Supabase:** create a project (keep the Data API on). Run both files in `supabase/migrations/` in the SQL Editor, in order. Set the Site URL and the redirect URL `https://YOUR-SITE/auth/callback`. Keep "Confirm email" on.
2. **Email:** set up custom SMTP (e.g. Resend with your own domain). Supabase's built-in email only reaches your own team, so without this nobody else can confirm their account or reset a password.
3. **Run locally:** `cp .env.example .env.local`, fill it in (Supabase > Connect, or Settings > API Keys: Project URL and publishable key), `npm install`, `npm run dev`.
4. **First admin:** sign up, then in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Use `'moderator'` for helpers. Only an admin can ban a moderator.
5. **Deploy:** import the repo into Vercel, add the same environment variables, deploy.
6. **CAPTCHA:** create a Cloudflare Turnstile widget, put its secret key in Supabase (Authentication > Attack Protection), then add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel and redeploy. Do both together: CAPTCHA on in Supabase without the site key in Vercel blocks every sign-up and login.

## Tests

```bash
npm run test:db      # trust & safety rules against a throwaway Postgres (needs Postgres installed),
                     # run twice: as a new Supabase project and as an older one
npm run typecheck
npm run build
```

CI runs all three on every push.

## Before going public

These block launch, not building:

1. **Legal review** of the job and marketplace rules (SPEC.md sections 6, 7 and 14) by a Bahrain lawyer or LMRA, especially household hiring and the ban on side gigs.
2. **Privacy Policy** (`/privacy`) checked against Bahrain's PDPL (Law No. 30 of 2018). It's marked as a draft on the page.
3. **Supabase paid plan** (about $25/month). Free projects pause after a week without traffic.
4. **CAPTCHA** on sign-up, login and password reset (step 6 above).
5. **Custom SMTP** so confirmation and password emails reach members (step 2 above).
6. **A moderator who clears the queues every day.** Posts that mention fees or visas wait for approval, so an ignored queue means real members' posts never go live.

## Known limits in v1

- Notifications are in the site only (bell icon). No email yet.
- Comments block phone numbers, emails and links (anyone can read comments, so contact details belong behind the Contact button). Some honest comments with long numbers, like a 7-digit reference, will be refused.
- Words like "visa" and "agent" will also flag honest posts ("visa provided by employer"). That's on purpose: a moderator looks before anything about visas goes live. Tune the list under Admin > Search & flag words.
- A member who uploads photos and then abandons the form leaves those photos in storage.
- If following fails (200-follow limit, or the other member blocked you), the button simply doesn't change.
- Blocking hides your posts from that member only while they are logged in. Logged out, anyone can see live posts.
