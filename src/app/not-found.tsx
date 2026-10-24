import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="display text-4xl">Page not found</h1>
      <p className="mt-4">This post may have been closed, deleted or hidden by a moderator.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/marketplace" className="btn btn-primary">Go to the marketplace</Link>
        <Link href="/jobs" className="btn btn-quiet">See jobs</Link>
      </div>
    </div>
  );
}
