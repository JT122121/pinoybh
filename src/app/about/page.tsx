import Link from "next/link";
import { contactEmail, TextPage } from "@/components/TextPage";
import { COMMUNITY_STATEMENT } from "@/lib/constants";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <TextPage title="About PinoyBH" intro={COMMUNITY_STATEMENT}>
      <p>
        PinoyBH is a place for kabayan in Bahrain to buy and sell, find a bedspace, share balikbayan box space, help
        each other find work, and get together at community events. It's free to use.
      </p>
      <h2>Made for the community</h2>
      <p>
        Everyone who joins confirms they are Filipino or part of the Filipino community in Bahrain, and agrees to the{" "}
        <Link href="/rules">community rules</Link>. Members can ask for a Verified Kabayan badge, which a moderator approves.
      </p>
      <h2>Individuals, not businesses</h2>
      <p>
        Posts are made by individuals for themselves. Agencies, recruiters and businesses can't post. This keeps out most
        of the job scams that target our community.
      </p>
      <h2>Contact the moderators</h2>
      <p>
        Email {contactEmail()}. For a problem with a post or a member, the Report button is faster.
      </p>
    </TextPage>
  );
}
