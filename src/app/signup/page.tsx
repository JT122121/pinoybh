import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getViewer } from "@/lib/viewer";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Join" };

export default async function SignupPage() {
  if (await getViewer()) redirect("/account");
  return (
    <AuthShell title="Join, kabayan">
      <SignupForm />
    </AuthShell>
  );
}
