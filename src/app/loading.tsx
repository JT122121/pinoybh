import { Sun } from "@/components/Sun";

/** Shown instantly while a page loads, so taps feel answered right away. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <div className="flex items-center gap-3 text-muted">
        <Sun className="loading-sun h-6 w-6 text-sun" />
        <span className="font-bold">Loading...</span>
      </div>
      <div className="mt-6 grid gap-3" aria-hidden>
        <div className="h-10 w-2/3 max-w-md rounded-xl bg-line/60" />
        <div className="h-5 w-full max-w-2xl rounded-lg bg-line/40" />
        <div className="panel mt-4 grid gap-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-20 w-20 shrink-0 rounded-xl bg-line/50" />
              <div className="grid flex-1 content-start gap-2">
                <div className="h-5 w-24 rounded bg-line/60" />
                <div className="h-4 w-3/4 rounded bg-line/40" />
                <div className="h-3 w-1/3 rounded bg-line/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
