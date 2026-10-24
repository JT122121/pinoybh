import { TextPage } from "@/components/TextPage";

export const metadata = { title: "Stay safe" };

export default function SafetyPage() {
  return (
    <TextPage title="Stay safe" intro="Most people here are honest. These habits protect you from the few who aren't.">
      <h2>Jobs</h2>
      <ul>
        <li>Never pay to get a job. Not for processing, training, a medical, a visa or a deposit.</li>
        <li>Don't send your passport or CPR photos to someone you met online.</li>
        <li>For a referral, check the link goes to the real company.</li>
        <li>Agencies and recruiters are not allowed here. If one contacts you, report the post.</li>
      </ul>
      <h2>Buying and selling</h2>
      <ul>
        <li>Meet in a busy public place, like a mall, in daylight.</li>
        <li>See the item before you pay. Never pay a &ldquo;reservation fee&rdquo; for a room or item you haven't seen.</li>
        <li>For a bedspace or room, visit first and meet the people you'll live with.</li>
      </ul>
      <h2>Events</h2>
      <ul>
        <li>Pay only at the event. Never send money, GCash or BenefitPay to &ldquo;reserve&rdquo; a slot.</li>
        <li>Check the venue is a real public place before you go. Go with a friend the first time.</li>
      </ul>
      <h2>Padala and balikbayan boxes</h2>
      <ul>
        <li>Never carry a package for someone you don't know, even a sealed gift. You are responsible for what's in your bag.</li>
        <li>Send money home only through a licensed bank or remittance company.</li>
      </ul>
      <h2>The Verified Kabayan badge</h2>
      <p>
        The badge means a moderator confirmed the member is part of the community. It does not mean they are a trusted
        seller or employer. Stay careful with everyone.
      </p>
    </TextPage>
  );
}
