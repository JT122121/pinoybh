import type { PostKind } from "./types";

/** The browse page for each kind of post. */
export const KIND_PATH: Record<PostKind, string> = {
  listing: "/marketplace",
  job: "/jobs",
  event: "/events",
};

export const KIND_LABEL: Record<PostKind, string> = {
  listing: "Marketplace",
  job: "Jobs",
  event: "Events",
};

export function isPostKind(v: unknown): v is PostKind {
  return v === "listing" || v === "job" || v === "event";
}
