"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel grid gap-3 p-5">
      <p className="font-bold text-flag">That action didn&rsquo;t go through.</p>
      <p>It may already have been handled by another moderator, or a required reason was missing.</p>
      <button type="button" className="btn btn-primary w-fit" onClick={reset}>Go back</button>
    </div>
  );
}
