# PinoyBH

A community marketplace and job board for Filipinos in Bahrain.

Members post for themselves (no businesses, agencies or recruiters): things to sell or give away, bedspaces, balikbayan box space, and jobs. The full product spec is in [SPEC.md](SPEC.md).

## How it's built

- **Next.js 15** (App Router, TypeScript, Tailwind CSS 4), hosted on **Vercel**.
- **Supabase**: Postgres database, logins, and photo storage.
- The trust & safety rules live **in the database**, not only in the app: the sign-up checkbox, post limits, words that send a post to review, contact details hidden from visitors, private follower lists, auto-hide after reports, bans, and the Verified Kabayan badge. They hold even if someone talks to Supabase directly.

```
supabase/migrations/   database schema, rules and permissions
supabase/tests/        61 tests for the trust & safety rules (npm run test:db)
src/app/               pages and server actions
src/components/        shared UI
src/content/rules.ts   the community rules text
```

## Set it up

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick a region near Bahrain (e.g. Mumbai or Frankfurt).
2. Run both files in `supabase/migrations/`, in order, in the **SQL Editor**. Or with the Supabase CLI: `supabase link` then `supabase db push`.
3. In **Authentication > URL Configuration**:
   - Site URL: your live address, e.g. `https://pinoybh.vercel.app`
   - Redirect URLs: add `https://pinoybh.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback` for local work)
4. In **Authentication > Providers > Email**, keep **Confirm email** on.
5. In **Authentication > Attack Protection**, turn on **CAPTCHA** (Cloudflare Turnstile is free). Without it, a banned person can make new accounts as fast as they like.

### 2. Run it on your computer

```bash
cp .env.example .env.local   # fill in the values from Supabase > Project Settings > API
npm install
npm run dev                  # http://localhost:3000
```

### 3. Make yourself the first admin

Sign up on the site, then run this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Use `'moderator'` for helpers. Moderators can handle reports, the review queue, verification and bans of members. Only an admin can ban a moderator.

### 4. Put it online

1. Import this GitHub repo into [Vercel](https://vercel.com/new).
2. Add the environment variables from `.env.example`.
3. Deploy. Update the Supabase Site URL and Redirect URLs to the final address.

## Tests

```bash
npm run test:db      # trust & safety rules against a throwaway Postgres (needs Postgres installed)
npm run typecheck
npm run build
```

CI runs all three on every push.

## Before going public

These block launch, not building:

1. **Legal review** of the job and marketplace rules (SPEC.md sections 6, 7 and 14) by a Bahrain lawyer or LMRA, especially household hiring and the ban on side gigs.
2. **Privacy Policy** (`/privacy`) checked against Bahrain's PDPL (Law No. 30 of 2018). It's marked as a draft on the page.
3. **Supabase paid plan** (about $25/month). Free projects pause after a week without traffic.
4. **CAPTCHA** on sign-up (step 1.5 above).
5. **A moderator who clears the queues every day.** Posts that mention fees or visas wait for approval, so an ignored queue means real members' posts never go live.

## Known limits in v1

- Notifications are in the site only (bell icon). No email yet.
- Words like "visa" and "agent" will also flag honest posts ("visa provided by employer"). That's on purpose: a moderator looks before anything about visas goes live. Tune the list under Admin > Search & flag words.
- A member who uploads photos and then abandons the form leaves those photos in storage.
- If following fails (200-follow limit, or the other member blocked you), the button simply doesn't change.
- Blocking hides your posts from that member only while they are logged in. Logged out, anyone can see live posts.
