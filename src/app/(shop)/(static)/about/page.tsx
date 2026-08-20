import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About KidsCares",
  description: "Who we are, how we choose products, and why parents trust us.",
  path: "/about",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        About KidsCares
      </h1>
      <p className="!text-base !text-ink-soft">Who we are, how we choose products, and why parents trust us.</p>
        <h2>Our story</h2>
        <p>KidsCares started with a simple frustration: buying for a growing child means guessing at sizes, ages and safety standards across a dozen different shops. We built one place where all of that is answered before you add to bag.</p>
        <h2>How we choose products</h2>
        <ul>
          <li>Every item is age-graded before it is listed</li>
          <li>Fabrics are OEKO-TEX certified, toys meet BIS / ISO 8124</li>
          <li>Sizing is verified against real measurements, not brand claims</li>
          <li>Anything with a repeat return rate above 8% is delisted</li>
        </ul>
        <h2>What we promise</h2>
        <p>Honest pricing with no inflated MRPs, free delivery above ₹999, and a 30-day return window with free pickup. If something is not right, we take it back — no argument.</p>
    </>
  );
}
