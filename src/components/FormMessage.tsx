import type { FormState } from "@/lib/types";

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-lg bg-flag-soft px-3 py-2 font-bold text-flag">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="rounded-lg bg-leaf-soft px-3 py-2 font-bold text-leaf">
        {state.success}
      </p>
    );
  }
  return null;
}
