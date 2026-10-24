"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { savePost } from "@/app/actions/posts";
import { AREAS, CONTACT_METHODS, JOB_CONFIRMATION, JOB_TYPES, SPONSORSHIP_CONFIRMATION } from "@/lib/constants";
import { toBahrainInputs } from "@/lib/format";
import type { Category, ContactMethod, JobType, Post, PostKind, PriceType } from "@/lib/types";
import { FormMessage } from "./FormMessage";
import { PhotoUploader } from "./PhotoUploader";
import { SubmitButton } from "./SubmitButton";

interface Props {
  userId: string;
  postId: string;
  categories: Category[];
  defaultArea: string | null;
  initialKind: PostKind;
  existing?: { post: Post; photos: string[]; contact: { method: ContactMethod; value: string } | null };
}

export function PostForm({ userId, postId, categories, defaultArea, initialKind, existing }: Props) {
  const [state, action] = useActionState(savePost, {});
  const post = existing?.post;
  const isEdit = Boolean(post);
  const [kind, setKind] = useState<PostKind>(post?.kind ?? initialKind);
  const [jobType, setJobType] = useState<JobType | "">(post?.job_type ?? "");
  const [priceType, setPriceType] = useState<PriceType>(post?.price_type ?? "fixed");
  const eventStart = toBahrainInputs(post?.event_starts_at ?? null);
  const eventEnd = toBahrainInputs(post?.event_ends_at ?? null);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={postId} />
      <input type="hidden" name="mode" value={isEdit ? "edit" : "new"} />
      <input type="hidden" name="kind" value={kind} />

      {!isEdit && (
        <fieldset className="grid gap-2">
          <legend className="field-label mb-1">What do you want to post?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["listing", "job", "event"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  if (k === "event") setPriceType("free");
                }}
                aria-pressed={kind === k}
                className={`btn whitespace-normal text-center leading-tight ${kind === k ? "btn-primary" : "btn-quiet"}`}
              >
                {k === "listing" ? "Sell or give away" : k === "job" ? "Job post" : "Event"}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {kind === "job" ? (
        <fieldset className="grid gap-2">
          <legend className="field-label mb-1">What kind of job post?</legend>
          {JOB_TYPES.map((j) => (
            <label key={j.value} className={`flex items-start gap-3 rounded-xl border-2 p-3 ${jobType === j.value ? "border-ink" : "border-line"}`}>
              <input
                type="radio"
                name="job_type"
                value={j.value}
                checked={jobType === j.value}
                onChange={() => setJobType(j.value)}
                disabled={isEdit}
                required
                className="mt-1 h-5 w-5 accent-ink"
              />
              <span>
                <span className="font-bold">{j.label}</span>
                <span className="block text-[0.9375rem] text-muted">{j.hint}</span>
              </span>
            </label>
          ))}
          {isEdit && <input type="hidden" name="job_type" value={jobType} />}
          <p className="text-[0.9375rem] text-muted">
            Not allowed: agencies, recruiters, part-time or freelance housemaid work, side gigs, and recruiting people from outside Bahrain.{" "}
            <Link href="/rules" target="_blank" className="underline">See the rules</Link>
          </p>
        </fieldset>
      ) : (
        <label className="field">
          <span className="field-label">Category</span>
          <select key={kind} name="category" className="input" defaultValue={post?.category ?? ""} required disabled={isEdit}>
            <option value="" disabled>{kind === "event" ? "What kind of event?" : "Choose a category"}</option>
            {categories.filter((c) => c.kind === kind).map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          {isEdit && <input type="hidden" name="category" value={post?.category} />}
        </label>
      )}

      <label className="field">
        <span className="field-label">Title</span>
        <span className="field-hint">
          {kind === "job"
            ? "For example: Experienced driver looking for work in Manama"
            : kind === "event"
              ? "For example: Simbang Gabi carpool and breakfast, Sacred Heart Church"
              : "For example: Rice cooker, 1.8L, almost new"}
        </span>
        <input name="title" className="input" required minLength={5} maxLength={100} defaultValue={post?.title} />
      </label>

      <label className="field">
        <span className="field-label">Description</span>
        <span className="field-hint">
          {kind === "job"
            ? "Duties, hours, salary, and what experience is needed."
            : kind === "event"
              ? "What happens, who it's for, what to bring."
              : "Condition, size, why you're selling, where to meet."}
        </span>
        <textarea name="description" className="input" required minLength={10} maxLength={4000} defaultValue={post?.description} />
      </label>

      {kind === "event" && (
        <fieldset className="grid gap-4">
          <legend className="field-label mb-1">When and where</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              <span className="field-label">Date</span>
              <input name="event_date" type="date" required className="input" defaultValue={eventStart.date} />
            </label>
            <label className="field">
              <span className="field-label">Starts</span>
              <input name="event_start" type="time" required className="input" defaultValue={eventStart.time} />
            </label>
            <label className="field">
              <span className="field-label">Ends (optional)</span>
              <input name="event_end" type="time" className="input" defaultValue={eventEnd.time} />
            </label>
          </div>
          <p className="field-hint -mt-2">Bahrain time.</p>
          <label className="field">
            <span className="field-label">Venue</span>
            <span className="field-hint">A public place: a hall, park, court, church or restaurant. Don&rsquo;t post a private home address here; share it with guests directly.</span>
            <input name="venue" required minLength={2} maxLength={120} className="input" defaultValue={post?.venue ?? ""} placeholder="e.g. Andalus Garden" />
          </label>
          <label className="field">
            <span className="field-label">Google Maps link (optional)</span>
            <span className="field-hint">In Google Maps, open the place, tap Share and copy the link.</span>
            <input name="map_url" type="url" className="input" defaultValue={post?.map_url ?? ""} placeholder="https://maps.app.goo.gl/..." />
          </label>
        </fieldset>
      )}

      {(kind === "listing" || kind === "event") && (
        <fieldset className="grid gap-2">
          <legend className="field-label mb-1">{kind === "event" ? "Entry" : "Price"}</legend>
          <div className="flex flex-wrap gap-2">
            {(kind === "event"
              ? ([["free", "Free"], ["fixed", "Pay at the door"]] as const)
              : ([["fixed", "Fixed price"], ["negotiable", "Negotiable"], ["free", "Free"]] as const)
            ).map(([value, label]) => (
              <label key={value} className={`btn btn-small ${priceType === value ? "btn-primary" : "btn-quiet"}`}>
                <input type="radio" name="price_type" value={value} checked={priceType === value} onChange={() => setPriceType(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
          {priceType !== "free" && (
            <label className="field mt-1 max-w-[14rem]">
              <span className="field-label">Amount in BD{priceType === "negotiable" ? " (optional)" : ""}</span>
              {kind === "event" && <span className="field-hint">Paid on the day only. Asking people to pay in advance to reserve a slot is not allowed.</span>}
              <input name="price_bhd" type="number" min="0" step="0.001" inputMode="decimal" className="input" required={priceType === "fixed"} defaultValue={post?.price_bhd ?? undefined} />
            </label>
          )}
        </fieldset>
      )}

      {jobType === "referral" && kind === "job" && (
        <label className="field">
          <span className="field-label">Link to the official job listing</span>
          <span className="field-hint">The company's careers page or job ad, so people can check it's real.</span>
          <input name="reference_url" type="url" className="input" required placeholder="https://" defaultValue={post?.reference_url ?? undefined} />
        </label>
      )}

      <label className="field max-w-sm">
        <span className="field-label">Area</span>
        <select name="area" className="input" defaultValue={post?.area ?? defaultArea ?? ""}>
          <option value="">Choose an area</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>

      <PhotoUploader userId={userId} postId={postId} initial={existing?.photos ?? []} />

      <fieldset className="grid gap-2">
        <legend className="field-label">How should people contact you?</legend>
        <p className="field-hint">Only logged-in members can see this, never visitors or search engines.</p>
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
          <select name="contact_method" className="input" defaultValue={existing?.contact?.method ?? "whatsapp"} aria-label="Contact method">
            {CONTACT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <input name="contact_value" className="input" maxLength={100} placeholder="+973 3xxx xxxx" defaultValue={existing?.contact?.value} aria-label="Number or email" />
        </div>
      </fieldset>

      {kind === "job" && (
        <div className="grid gap-2">
          <label className="flex items-start gap-3 rounded-xl bg-sun-soft p-3">
            <input name="own_post_confirmed" type="checkbox" required defaultChecked={post?.own_post_confirmed} className="mt-1 h-5 w-5 shrink-0 accent-ink" />
            <span>{JOB_CONFIRMATION}</span>
          </label>
          {jobType === "household" && (
            <label className="flex items-start gap-3 rounded-xl bg-sun-soft p-3">
              <input name="sponsorship_confirmed" type="checkbox" required defaultChecked={post?.sponsorship_confirmed} className="mt-1 h-5 w-5 shrink-0 accent-ink" />
              <span>{SPONSORSHIP_CONFIRMATION}</span>
            </label>
          )}
        </div>
      )}

      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Saving...">{isEdit ? "Save changes" : "Publish post"}</SubmitButton>
        <p className="text-[0.9375rem] text-muted">
          Posts that mention fees, visas or banned items are checked by a moderator before they go live.
        </p>
      </div>
    </form>
  );
}
