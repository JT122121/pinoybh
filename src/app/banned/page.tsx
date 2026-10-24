import Link from "next/link";

export const metadata = { title: "Account banned" };

export default function BannedPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="display text-4xl">Your account is banned</h1>
      <p className="mt-4">
        A moderator banned this account for breaking the <Link href="/rules" className="font-bold underline">community rules</Link>.
        Your posts are no longer shown and you cannot log in.
      </p>
      <p className="mt-3 text-muted">If you think this is a mistake, email {process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "the moderators"}.</p>
    </div>
  );
}
