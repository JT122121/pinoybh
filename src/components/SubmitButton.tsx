"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  confirm,
  className = "btn btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
  /** Ask "Are you sure?" with this text before submitting. For actions that are hard to undo. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
      {...rest}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        rest.onClick?.(e);
      }}
    >
      {pending ? pendingText ?? "Saving..." : children}
    </button>
  );
}
