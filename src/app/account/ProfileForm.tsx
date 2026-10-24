"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";
import { AvatarField } from "@/components/AvatarField";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { AREAS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action} className="grid gap-4">
      <AvatarField userId={profile.id} initial={profile.avatar_path} name={profile.display_name} />
      <label className="field">
        <span className="field-label">Your name</span>
        <input name="display_name" className="input" required minLength={2} maxLength={40} defaultValue={profile.display_name} />
      </label>
      <label className="field">
        <span className="field-label">Area</span>
        <select name="area" className="input" defaultValue={profile.area ?? ""}>
          <option value="">Not shown</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">About you (optional)</span>
        <textarea name="bio" className="input" maxLength={300} defaultValue={profile.bio ?? ""} />
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-fit">Save profile</SubmitButton>
    </form>
  );
}
