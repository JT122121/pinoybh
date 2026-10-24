import Link from "next/link";
import { notFound } from "next/navigation";
import { TextPage } from "@/components/TextPage";
import { SHOW_PRIVACY } from "@/lib/constants";

export const metadata = SHOW_PRIVACY
  ? { title: "Privacy Policy", description: "How PinoyBH collects, uses and protects your personal information." }
  : { title: "Page not found" };

const UPDATED = "24 October 2026";

function Contact() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return email ? (
    <a href={`mailto:${email}`}>{email}</a>
  ) : (
    <Link href="/about">the contact address on our About page</Link>
  );
}

export default function PrivacyPage() {
  if (!SHOW_PRIVACY) notFound();
  const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME;
  return (
    <TextPage
      title="Privacy Policy"
      intro="We collect as little about you as we can, we never sell it, and you can delete your account at any time."
    >
      <p className="text-muted">Last updated: {UPDATED}</p>

      <h2>Who we are</h2>
      <p>
        PinoyBH ({`"we"`}) is a community marketplace, job board and events page for Filipinos in Bahrain, at pinoybh.com.{" "}
        {operator ? `It is run by ${operator}, in the Kingdom of Bahrain.` : "It is run by volunteers from the Filipino community in Bahrain."}{" "}
        We decide what personal information the site collects and why, so we are responsible for it under Bahrain&rsquo;s
        Personal Data Protection Law (Law No. 30 of 2018).
      </p>
      <p>
        Questions or requests about your information: <Contact />.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>When you join:</strong> your email address and password, your name as you want it shown, and the date and time
        you agreed to the community rules. Your password is stored scrambled (hashed); nobody at PinoyBH can read it.
      </p>
      <p>
        <strong>We do not collect your nationality.</strong> The sign-up checkbox is an agreement to the community rules. We
        store only that you agreed, not your nationality or ethnic origin.
      </p>
      <p>
        <strong>If you choose to add them:</strong> your area in Bahrain, a profile photo and a short bio.
      </p>
      <p>
        <strong>What you post:</strong> listings, job posts and events, with their photos, prices, areas and venues; comments
        and replies; and the contact details (WhatsApp, phone or email) you add to a post.
      </p>
      <p>
        <strong>What you do on the site:</strong> members, categories and searches you follow; members you block; events you
        mark Going or Interested; posts you mute; reports you send; and notifications we create for you.
      </p>
      <p>
        <strong>Verified Kabayan badge (optional):</strong> a link to your public social media profile and, if you choose, a
        Philippine mobile number. We never ask for passport, CPR or ID images, and you should never send them.
      </p>
      <p>
        <strong>Technical information:</strong> our service providers automatically record IP addresses, browser type and the
        time of requests, to keep the site working and secure (for example, to stop someone trying many passwords). We also count how many times each page is opened per day, so we know how the site is used. That count is
        anonymous: it doesn&rsquo;t record who you are, your IP address or your device, and your browser only remembers the date of
        your last visit.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To create and run your account and show your posts, comments and profile. (Needed to provide the service you signed up for.)</li>
        <li>To send emails you need: confirming your email address and resetting your password. We don&rsquo;t send marketing emails.</li>
        <li>To show notifications on the site, such as new comments, replies, and changes to events you&rsquo;re going to.</li>
        <li>To keep the community safe: checking posts that mention fees or visas, handling reports, banning members who break the rules, and stopping spam and fake accounts. (Our legitimate interest in a safe community.)</li>
        <li>To review Verified Kabayan requests. (Your consent: you can withdraw it by asking us to remove your badge and the request.)</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your information, show ads, use advertising or tracking cookies, or use analytics tools
        that follow you across other websites.
      </p>

      <h2>Who can see what</h2>
      <ul>
        <li><strong>Everyone, including visitors who aren&rsquo;t logged in:</strong> your name, profile photo, area, bio, join date, badge, live posts and comments.</li>
        <li><strong>Logged-in members only:</strong> the contact details you put on a post.</li>
        <li><strong>Only you:</strong> your email address, who you follow, who you block, and the events you said you&rsquo;re going to. Others see only the number of people going, not who. (The site owner can see account emails in the database, and uses them only to run the site and answer requests.)</li>
        <li><strong>Moderators:</strong> reports, posts waiting for review, Verified Kabayan requests (including the optional Philippine mobile number), and posts and comments that were hidden. Moderators cannot see your password.</li>
      </ul>
      <p>
        Please think before posting. Anything public on the site can be seen and copied by anyone. Don&rsquo;t post private home
        addresses, ID numbers or other people&rsquo;s details.
      </p>

      <h2>Companies that process data for us</h2>
      <p>We use these providers to run the site. They process data only to provide their service to us.</p>
      <ul>
        <li><strong>Supabase</strong>: database, logins and photo storage. Data is stored on servers in <strong>Mumbai, India</strong>.</li>
        <li><strong>Vercel</strong>: hosts the website. Pages are processed in Mumbai, India and delivered through a worldwide network.</li>
        <li><strong>Resend</strong>: sends account emails (confirmation and password reset), from servers in <strong>Ireland (EU)</strong>.</li>
        <li><strong>Cloudflare Turnstile</strong>, if switched on: checks that sign-ups and logins come from a person, not a bot.</li>
      </ul>
      <p>
        This means your information is transferred outside Bahrain, mainly to India and the EU. We use well-known providers that
        protect data with encryption and access controls.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li><strong>Your account and posts:</strong> until you delete them or your account.</li>
        <li><strong>Closed posts:</strong> kept on your account until you delete them, but no longer shown in search.</li>
        <li><strong>Reports and moderator records:</strong> kept while the accounts involved exist, so moderators can see a member&rsquo;s history of rule-breaking.</li>
        <li><strong>Banned accounts:</strong> kept, so the same email can&rsquo;t simply sign up again. Contact us if you think a ban is a mistake.</li>
        <li><strong>Technical logs:</strong> kept by our providers for a short time, usually days to a few weeks.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        Go to <Link href="/account">My posts &amp; settings</Link> and choose <strong>Delete my account</strong>. This permanently
        removes your profile, posts, photos, comments, follows, blocks, event answers, notifications, reports you sent and any
        Verified Kabayan request. Moderator log entries about your account remain, but they no longer link to your profile.
      </p>

      <h2>Your rights</h2>
      <p>Under Bahrain&rsquo;s Personal Data Protection Law, you can ask us to:</p>
      <ul>
        <li>tell you what information we hold about you and give you a copy;</li>
        <li>correct information that is wrong (you can also edit your profile and posts yourself);</li>
        <li>delete your information, or stop using it for a particular purpose;</li>
        <li>withdraw consent you gave, such as for the Verified Kabayan badge.</li>
      </ul>
      <p>
        Email <Contact /> from the address you use on PinoyBH. We aim to reply within 15 working days. If you&rsquo;re not
        happy with our answer, you can complain to Bahrain&rsquo;s Personal Data Protection Authority.
      </p>

      <h2>Security</h2>
      <p>
        All connections use encryption (HTTPS). Passwords are hashed. Access to data is controlled by strict database rules, so
        for example a member&rsquo;s phone number can&rsquo;t be read by visitors who aren&rsquo;t logged in. No system is perfect: use
        a password you don&rsquo;t use anywhere else, and tell us at once if you think your account was misused.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you logged in. If the anti-bot check (Cloudflare Turnstile) is switched on, it may
        also use a cookie to tell people from bots. We don&rsquo;t use advertising or tracking cookies.
      </p>

      <h2>Age</h2>
      <p>PinoyBH is for adults. Please don&rsquo;t use it if you are under 18.</p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy, we will update the date at the top. If a change is important, we&rsquo;ll also put a notice on the
        site.
      </p>
    </TextPage>
  );
}
