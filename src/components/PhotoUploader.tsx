"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/format";
import { MAX_PHOTOS } from "@/lib/constants";

/** Shrinks a photo to at most 1600px and re-encodes it as JPEG, so uploads stay small on mobile data. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.82));
}

export function PhotoUploader({ userId, postId, initial }: { userId: string; postId: string; initial: string[] }) {
  const [paths, setPaths] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - paths.length;
    if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos. Only the first ${room} were added.`);
    setBusy(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const blob = await shrink(file);
        const path = `${userId}/${postId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        added.push(path);
      } catch {
        setError("A photo could not be uploaded. Check your connection and try again.");
      }
    }
    setPaths((p) => [...p, ...added]);
    setBusy(false);
  }

  function remove(path: string) {
    // Saved photos are deleted from storage when the post is saved.
    // New uploads that were never saved are removed right away.
    if (!initial.includes(path)) void createClient().storage.from("media").remove([path]);
    setPaths((p) => p.filter((x) => x !== path));
  }

  function makeFirst(path: string) {
    setPaths((p) => [path, ...p.filter((x) => x !== path)]);
  }

  return (
    <div className="field">
      <span className="field-label">Photos (up to {MAX_PHOTOS})</span>
      <span className="field-hint">Use your own real photos. The first photo is shown in search.</span>
      {paths.map((p) => (
        <input key={p} type="hidden" name="photo" value={p} />
      ))}
      <ul className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {paths.map((p, i) => (
          <li key={p} className="relative aspect-square overflow-hidden rounded-lg bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(p)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <div className="absolute inset-x-1 bottom-1 flex gap-1">
              {i > 0 && (
                <button type="button" onClick={() => makeFirst(p)} className="flex-1 rounded bg-white/90 px-1 text-xs font-bold">
                  Make first
                </button>
              )}
              <button type="button" onClick={() => remove(p)} className="rounded bg-white/90 px-1.5 text-xs font-bold text-flag" aria-label={`Remove photo ${i + 1}`}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {paths.length < MAX_PHOTOS && (
        <label className="btn btn-quiet mt-1 w-fit">
          {busy ? "Uploading..." : "Add photos"}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        </label>
      )}
      {error && <p role="alert" className="text-[0.9375rem] font-bold text-flag">{error}</p>}
    </div>
  );
}
