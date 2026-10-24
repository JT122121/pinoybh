"use client";

import { useState } from "react";

const STEPS: Record<"facebook" | "instagram" | "other", { name: string; steps: string[]; check: string }> = {
  facebook: {
    name: "Facebook",
    steps: [
      "Open the Facebook app and tap your profile picture to open your profile.",
      "Tap Edit profile.",
      "Next to Bio, tap Add (or Edit if you already have one).",
      "Paste the code anywhere in your bio, then tap Save.",
    ],
    check: "Your bio must be visible to Public, or the moderator can't see the code.",
  },
  instagram: {
    name: "Instagram",
    steps: [
      "Open the Instagram app and tap your profile picture at the bottom right.",
      "Tap Edit profile.",
      "Tap Bio, paste the code anywhere in it, then tap Done (✓).",
    ],
    check: "Your account must be public, or the moderator can't see the code.",
  },
  other: {
    name: "your profile",
    steps: [
      "Open the profile you linked and go to edit your profile.",
      "Paste the code into your bio, intro or about section, then save.",
    ],
    check: "The bio must be visible to everyone, or the moderator can't see the code.",
  },
};

function siteOf(url: string): keyof typeof STEPS {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("facebook.com") || is("fb.com") || is("fb.me")) return "facebook";
  if (is("instagram.com") || is("instagr.am")) return "instagram";
  return "other";
}

export function VerificationSteps({ code, socialUrl }: { code: string; socialUrl: string }) {
  const [copied, setCopied] = useState(false);
  const site = STEPS[siteOf(socialUrl)];

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the code is selectable, so it can still be copied by hand.
    }
  }

  return (
    <div className="grid gap-4">
      <p>
        Your request is waiting for a moderator. To prove the {site.name === "your profile" ? "profile" : `${site.name} profile`} is
        yours, put this code in its bio:
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p className="display select-all whitespace-nowrap rounded-xl bg-sun-soft px-4 py-3 text-xl sm:text-2xl">{code}</p>
        <button type="button" onClick={copy} className="btn btn-quiet btn-small" aria-live="polite">
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>

      <div>
        <h3 className="font-bold">How to add it on {site.name}</h3>
        <ol className="mt-2 grid list-decimal gap-1.5 pl-6">
          {site.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[0.9375rem]">{site.check}</p>
      </div>

      <p className="text-[0.9375rem] text-muted">
        A moderator will open{" "}
        <a href={socialUrl} target="_blank" rel="noreferrer nofollow" className="break-all underline">
          the profile you sent
        </a>{" "}
        and look for the code. Once you have the badge, you can delete the code from your bio.
      </p>
    </div>
  );
}
