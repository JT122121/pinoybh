export type PostKind = "listing" | "job";
export type JobType = "looking_for_work" | "referral" | "household";
export type PostStatus = "active" | "pending_review" | "hidden" | "removed" | "closed";
export type PriceType = "fixed" | "negotiable" | "free";
export type ContactMethod = "whatsapp" | "phone" | "email";
export type ReportReason = "scam" | "spam" | "illegal_item" | "fake_job" | "not_community" | "other";
export type UserRole = "member" | "moderator" | "admin";

export interface Profile {
  id: string;
  display_name: string;
  area: string | null;
  bio: string | null;
  avatar_path: string | null;
  role: UserRole;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
}

export type AuthorSummary = Pick<Profile, "id" | "display_name" | "is_verified" | "avatar_path" | "area">;

export interface Photo {
  path: string;
  position: number;
}

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  category: string;
  job_type: JobType | null;
  title: string;
  description: string;
  price_type: PriceType | null;
  price_bhd: number | null;
  area: string | null;
  reference_url: string | null;
  own_post_confirmed: boolean;
  sponsorship_confirmed: boolean;
  status: PostStatus;
  flagged_terms: string[];
  created_at: string;
  updated_at: string;
}

export interface PostWithExtras extends Post {
  author: AuthorSummary | null;
  photos: Photo[];
}

export interface Category {
  slug: string;
  name: string;
  kind: PostKind;
  sort_order: number;
}

/** Return value for forms that use useActionState. */
export interface FormState {
  error?: string;
  success?: string;
}
