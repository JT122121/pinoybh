import { contactEmail, TextPage } from "@/components/TextPage";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <TextPage title="Privacy" intro="We keep as little about you as we can.">
      <p className="rounded-lg bg-sun-soft p-3">
        Draft. This page must be checked against Bahrain&rsquo;s Personal Data Protection Law (Law No. 30 of 2018) before
        the site opens to the public.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Your email and password (handled by our login provider, Supabase).</li>
        <li>Your name, and optionally your area, photo and a short bio.</li>
        <li>The date you agreed to the community rules. We do not store your nationality.</li>
        <li>Your posts, photos and contact details you add to posts.</li>
        <li>What you follow and who you block. Only you can see these.</li>
        <li>Reports you send, and moderator decisions.</li>
        <li>If you ask for the Verified Kabayan badge: your social profile link and, if you choose, a Philippine mobile number. Only moderators see these.</li>
      </ul>
      <h2>What we never collect</h2>
      <p>Passport, CPR or ID images. Moderators will never ask for them.</p>
      <h2>Who can see what</h2>
      <ul>
        <li>Anyone can see live posts and public profiles.</li>
        <li>Only logged-in members can see the contact details on a post.</li>
        <li>Nobody can see who follows whom.</li>
      </ul>
      <h2>Deleting your data</h2>
      <p>
        You can delete your account at any time from My account. This removes your profile, posts, photos and follows.
        Banned accounts can&rsquo;t log in, so they stay on record and the same email can&rsquo;t sign up again. Questions: {contactEmail()}.
      </p>
    </TextPage>
  );
}
