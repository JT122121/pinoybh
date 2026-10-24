# PinoyBH — v1 Spec (draft)

> A community marketplace and job board for Filipinos in Bahrain.

Status: **approved for build** (owner: "best policy"). Items marked **[DEFAULT]** were decided on the owner's behalf and can be overturned later.

---

## 1. Purpose

- Individuals post. No business, agency or recruiter accounts.
- One account type: **Member**.
- Two kinds of posts: **Marketplace listings** and **Job posts**.

## 2. Language and tone

- All UI text in clear, simple English. No translation toggle in v1.
- Warm, plain, community tone. No corporate wording.
- Light Filipino touches in branding only (e.g. "Mabuhay, Kabayan!" on the home page). All functional text (buttons, forms, errors) stays in English.

## 3. Stack **[DEFAULT]**

- Next.js (App Router, TypeScript), code in GitHub repo `pinoybh`.
- Supabase: Postgres, Auth (email + password, magic link), Storage (photos).
- Hosted on Vercel's free plan. Supabase free projects pause after ~1 week idle; upgrade (~$25/mo) before launch traffic matters.
- GitHub Pages is not used: it cannot run logins, reports or the admin dashboard.

## 4. Accounts and sign-up

- Home, About and Sign-up pages all state: "A community marketplace and job board for Filipinos in Bahrain."
- Required checkbox at sign-up:
  "I am a Filipino or part of the Filipino community in Bahrain, and I agree to follow the community rules."
- Store only `rules_agreed_at` (timestamp). Do **not** store a nationality or "is Filipino" field (Bahrain PDPL, Law 30 of 2018, may treat ethnic origin as sensitive data).
- Profile: display name, area in Bahrain (e.g. Manama, Juffair, Riffa, Muharraq, Isa Town), optional photo, optional short bio.
- New-account limits: max 3 posts in the first 7 days; max 2 active job posts per member at any time.
- Members can delete their account and all their posts (privacy requirement).

## 5. Verified Kabayan badge

- Optional. Member requests it from their profile.
- Proof method **[DEFAULT]**: member links a public social profile and places a one-time code (shown on the request screen) in that profile's bio/intro. Admin checks the code is there, then approves.
- Optional field: Philippine mobile number (+63). Shown to the admin as a supporting signal only; not verified by SMS in v1.
- Never collect or store passport, CPR or ID images.
- Badge label: "Verified Kabayan: confirmed community member." It must never imply "trusted seller" or "safe employer". A tooltip says so.
- Admin can revoke the badge.

## 6. Marketplace listings

Categories **[DEFAULT]** (owner to confirm):
- Buy & Sell: electronics, phones, furniture, appliances, clothes, baby & kids, vehicles, other
- Filipino Food & Pasalubong
- Housing: bedspace, room for rent, flat share
- Balikbayan Box Sharing: individuals sharing space in a box they are already sending home
- Free / Giveaway
- Lost & Found

Fields: title, description, category, price in BHD (or "Free" / "Negotiable"), area, up to 6 photos, contact method.

Padala / cargo policy (decided):
- Cargo and forwarding **businesses may not post**. Individuals only. Lost or never-delivered balikbayan boxes are a common scam, and the site cannot vet businesses in v1.
- Individuals may offer spare space in a box they are already sending.
- **Hand-carry for strangers is banned** ("I'm flying home, I can carry your package"). Carrying a sealed package for someone you don't know through an airport can land the carrier in prison if it contains something illegal.
- v1.1 idea: an admin-curated "Community Services" directory of cargo businesses that the admin has vetted.

Banned in rules and checked in moderation: money transfer / remittance offers (unlicensed remittance is illegal in Bahrain), alcohol, drugs, prescription medicine, weapons, counterfeit goods, visas or CPRs for sale.

## 7. Job posts

Allowed types (decided):
1. **Looking for work**: a member posts about themselves.
2. **Referral**: "My company is hiring." Must include a link to the official listing or company contact.
3. **Household hiring**: a household hiring full-time staff (helper, driver, nanny). Must state the job is with proper sponsorship/work permit.

Not allowed in v1 (decided):
- Part-time / freelance housemaid offers.
- Side gigs and services (cooking, haircuts, cleaning, tutoring). Working outside one's sponsor can be illegal on many Bahrain work visas. Revisit with legal advice.
- Any recruitment from outside Bahrain ("we'll process your visa").

Every job post requires a tick: "This is my own post. I am not an agency or recruiter, and no one will be asked to pay any fee."

Auto-flag for admin review (post stays hidden until reviewed): text containing visa, processing, placement fee, deposit, pay first, agency, or their common misspellings.

## 8. Contact **[DEFAULT]**

- Posts show a contact method (WhatsApp, phone, or email) chosen by the poster.
- Contact details are visible only to logged-in members. Logged-out visitors see "Log in to contact."
- In-site messaging is out of scope for v1.

## 9. Follow

Members can follow:
- **Other members**: get notified when that member publishes a new post.
- **Categories** (e.g. Housing, Filipino Food): get notified of new posts in that category.
- **Saved searches** **[DEFAULT]**: e.g. "bedspace Juffair", get notified of new matches.

Rules:
- Follower and following lists are **private**. A member sees their own follower *count* only, never who follows them. (Prevents tracking and harassment.)
- Blocking a member removes their follow and stops them seeing your posts while logged in.
- Notifications: in-app bell in v1. Email digest (daily, opt-in) is v1.1.
- Limit: max 200 follows per member (stops scraping by following everyone).

## 10. Search

- Postgres full-text search plus `pg_trgm` fuzzy matching for spelling mistakes.
- A synonym table maintained by admins, seeded with:

| Filipino / Taglish term | Also matches |
|---|---|
| padala, pa-dala | cargo, courier, balikbayan box, forwarder |
| pasalubong | gifts, snacks, Filipino food |
| kasambahay, kasama sa bahay | helper, housemaid, maid, domestic worker, nanny, yaya |
| yaya | nanny, babysitter |
| bayad | payment, price, fee |
| bedspace, bed space | room, sharing, partition |
| ulam, lutong bahay | home-cooked food, viand |
| tsinelas | slippers |

- Filters: category, area, price range, post type, Verified Kabayan only.

## 11. Reports and moderation

- "Report" button on every post and every profile.
- Reasons: Scam, Spam, Illegal item, Fake job, Not part of the community, Other (free text required for Other).
- "Not part of the community" requires a short explanation, so it cannot be used just because of someone's name or appearance.
- A post reported by 3 different members is hidden automatically until an admin reviews it.
- Moderation team **[DEFAULT]**: one admin to start. Database has roles (`member`, `moderator`, `admin`) so moderators can be added later. Every admin action is logged (who, what, when).

## 12. Admin dashboard

- Report queue (oldest first), with post/profile preview and reporter reasons.
- Auto-flagged job posts queue.
- Verified Kabayan requests: approve / reject / revoke.
- Ban / unban a member, with reason. Banned members cannot log in; their posts are hidden.
- Synonym table editor.
- Action log.

## 13. Pages

- Home ("Mabuhay, Kabayan!", community statement, latest posts, search)
- Browse marketplace / Browse jobs
- Post detail
- Create / edit post
- Profile (public view and own settings)
- Following & notifications
- Sign up / Log in
- About
- Community Rules
- Privacy Policy
- Admin dashboard (admins only)

## 14. Community Rules (page content, draft)

1. **Be honest.** Describe items and jobs truthfully. Use real photos. No fake prices or bait listings.
2. **No fees for jobs. Ever.** No one may charge job seekers to apply, for "processing", or for a placement. If someone asks you to pay to get a job, report it.
3. **Individuals only.** Post for yourself. No agencies, recruiters or business ads.
4. **No illegal or prohibited items.** No alcohol, drugs, medicine, weapons, fake goods, visas or CPRs for sale, and no money-transfer services. No cargo businesses, and never carry a package for a stranger on a flight.
5. **Follow Bahrain law.** Only offer or accept work you are legally allowed to do.
6. **No harassment.** No insults, threats, unwanted messages, or sharing other people's private details.
7. **Respect each other.** We are all kabayan here. Treat others the way you want to be treated.

Breaking these rules can get your posts removed and your account banned.

## 15. Out of scope for v1

In-site messaging, SMS verification, email notifications, translation toggle, payments, ratings/reviews, mobile app.

## 16. Launch checklist

These do not block building. They **block public launch**:

1. Legal review: a Bahrain lawyer (or LMRA guidance) checks sections 6, 7 and 14, especially household hiring and the no-side-gigs rule.
2. Privacy Policy reviewed against Bahrain PDPL (Law 30 of 2018).
3. Upgrade Supabase off the free plan so the site does not pause.
4. At least one admin committed to clearing the report queue daily.
