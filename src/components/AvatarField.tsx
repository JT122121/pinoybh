"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/format";

export function AvatarField({ userId, initial, name }: { userId: string; initial: string | null; name: string }) {
  const [path, setPath] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const size = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 400;
      canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 400, 400);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error())), "image/jpeg", 0.85));
      const next = `${userId}/avatar/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await createClient().storage.from("media").upload(next, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      setPath(next);
    } catch {
      setError("The photo could not be uploaded.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="avatar_path" value={path} />
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-xl font-bold">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(path)} alt="" className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 1)
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-quiet btn-small">
          {busy ? "Uploading..." : path ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {path && (
          <button type="button" className="btn btn-quiet btn-small" onClick={() => setPath("")}>Remove</button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-flag">{error}</p>}
    </div>
  );
}
