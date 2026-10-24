import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { safeNext } from "@/lib/format";
import { getViewer } from "@/lib/viewer";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; confirmed?: string; reset?: string }>;
}) {
  const { next, error, confirmed, reset } = await searchParams;
  if (await getViewer()) redirect(safeNext(next));
  const notice = error === "link" ? "link" : reset ? "reset" : confirmed ? "confirmed" : undefined;
  return (
    <AuthShell title="Welcome back">
      <LoginForm next={safeNext(next)} notice={notice} />
    </AuthShell>
  );
}
