import { setBan } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";

export function BanForm({ userId, banned }: { userId: string; banned: boolean }) {
  return (
    <form action={setBan} className="flex flex-wrap gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="banned" value={banned ? "false" : "true"} />
      <input name="note" required minLength={5} maxLength={300} placeholder={banned ? "Reason for unbanning" : "Reason for the ban"} className="input min-h-9 flex-1 py-1 text-[0.9375rem]" />
      <SubmitButton className={`btn btn-small ${banned ? "btn-quiet" : "btn-danger"}`} pendingText="Saving...">
        {banned ? "Unban" : "Ban member"}
      </SubmitButton>
    </form>
  );
}
