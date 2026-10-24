/** The community rules. Shown on /rules and linked from sign-up and every post form. */
export const RULES: { title: string; body: string }[] = [
  {
    title: "Be honest",
    body: "Describe items and jobs truthfully. Use your own real photos. No fake prices, no bait posts, and no pretending to be someone else.",
  },
  {
    title: "No fees for jobs. Ever.",
    body: "No one may charge a job seeker to apply, for \"processing\", for training, for a medical, or for a placement. If anyone asks you to pay to get a job, report the post.",
  },
  {
    title: "Individuals only",
    body: "Post for yourself. No agencies, recruiters, cargo or remittance businesses, and no business ads. Recruiting people from outside Bahrain is not allowed.",
  },
  {
    title: "No illegal or prohibited items",
    body: "No alcohol, drugs, medicine, weapons, fake or copied goods, and no visas or CPRs for sale. No money-transfer services. Never carry a package for a stranger on a flight.",
  },
  {
    title: "Follow Bahrain law",
    body: "Only offer or accept work you are legally allowed to do. Part-time or freelance housemaid work and side gigs are not allowed on this site.",
  },
  {
    title: "Events: safe and open",
    body: "Events are free or paid at the door. Never ask people to pay in advance to \"reserve\" a slot. Use a public venue, not a private home address. No political rallies or campaigns.",
  },
  {
    title: "No harassment",
    body: "No insults, threats, unwanted messages, or sharing other people's private details or photos. Don't report someone just because of their name or how they look.",
  },
  {
    title: "Respect each other",
    body: "We are all kabayan here. Treat others the way you want to be treated, even when a deal doesn't work out.",
  },
];

/** Posting limits, shown on /rules#limits. Keep in step with the database rules in supabase/migrations. */
export const POSTING_LIMITS: { what: string; limit: string }[] = [
  { what: "New accounts (first 7 days)", limit: "Up to 6 posts in total. Listings, jobs and events all count." },
  { what: "Job posts", limit: "Up to 6 live at a time. Close one to post another." },
  { what: "Photos", limit: "Up to 6 per post." },
  { what: "Comments", limit: "Up to 10 an hour in your first 7 days, then up to 60 an hour." },
  { what: "Reports", limit: "Up to 20 a day." },
];
