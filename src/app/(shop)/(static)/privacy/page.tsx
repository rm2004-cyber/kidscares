import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "What data KidsCares collects, why, and how you control it.",
  path: "/privacy",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Privacy Policy
      </h1>
      <p className="!text-base !text-ink-soft">What data KidsCares collects, why, and how you control it.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email, phone, delivery addresses</li>
          <li>Order history and payment status (never full card numbers)</li>
          <li>Device and usage data used to keep the site fast and secure</li>
        </ul>
        <h2>Children's data</h2>
        <p>KidsCares accounts are for adults only. We do not knowingly collect personal information from children. Any child-related detail you enter — such as an age band used to filter products — is stored against your own account as a shopping preference, never as a profile of your child.</p>
        <h2>How we use it</h2>
        <p>To process orders, provide support, prevent fraud and — only with your consent — send offers. We do not sell personal data.</p>
        <h2>Your rights</h2>
        <p>You can access, correct, export or delete your data at any time from your account, or by writing to care@kidscares.example.</p>
    </>
  );
}
