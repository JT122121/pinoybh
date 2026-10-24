import type { ContactMethod, JobType, PostStatus, ReportReason } from "./types";

export const COMMUNITY_STATEMENT = "A community marketplace, job board and events page for Filipinos in Bahrain.";

export const COMMUNITY_CHECKBOX =
  "I am a Filipino or part of the Filipino community in Bahrain, and I agree to follow the community rules.";

export const JOB_CONFIRMATION =
  "This is my own post. I am not an agency or recruiter, and no one will be asked to pay any fee.";

export const SPONSORSHIP_CONFIRMATION =
  "This is a full-time job with proper sponsorship or a valid work permit. It is not part-time or freelance housemaid work.";

export const AREAS = [
  "Manama", "Juffair", "Adliya", "Hoora", "Gudaibiya", "Seef", "Sanabis", "Zinj", "Tubli",
  "Muharraq", "Busaiteen", "Amwaj", "Riffa", "Isa Town", "Hamad Town", "Sitra", "Salmabad",
  "A'ali", "Budaiya", "Saar", "Janabiya", "Awali", "Zallaq", "Other",
] as const;

export const REPORT_REASONS: { value: ReportReason; label: string; needsDetails: boolean }[] = [
  { value: "scam", label: "Scam", needsDetails: false },
  { value: "spam", label: "Spam", needsDetails: false },
  { value: "illegal_item", label: "Illegal item", needsDetails: false },
  { value: "fake_job", label: "Fake job", needsDetails: false },
  { value: "not_community", label: "Not part of the community", needsDetails: true },
  { value: "other", label: "Other", needsDetails: true },
];

export const REPORT_REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<
  ReportReason,
  string
>;

export const JOB_TYPES: { value: JobType; category: string; label: string; hint: string }[] = [
  { value: "looking_for_work", category: "looking-for-work", label: "I'm looking for work", hint: "Tell employers about yourself and the work you want." },
  { value: "referral", category: "referral", label: "My company is hiring", hint: "Share a job at your workplace. Add a link to the official job listing." },
  { value: "household", category: "household", label: "My household is hiring", hint: "Full-time helper, driver or nanny, with proper sponsorship." },
];

export const CONTACT_METHODS: { value: ContactMethod; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
];

export const STATUS_LABEL: Record<PostStatus, string> = {
  active: "Live",
  pending_review: "Waiting for review",
  hidden: "Hidden after reports",
  removed: "Removed by a moderator",
  closed: "Closed",
};

export const MAX_PHOTOS = 6;
