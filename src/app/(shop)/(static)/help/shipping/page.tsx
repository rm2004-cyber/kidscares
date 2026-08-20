import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Shipping & Delivery",
  description: "Delivery timelines, charges and coverage across India.",
  path: "/help/shipping",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Shipping & Delivery
      </h1>
      <p className="!text-base !text-ink-soft">Delivery timelines, charges and coverage across India.</p>
        <h2>Charges</h2>
        <p>Free on orders above ₹999. Below that, a flat ₹49 applies. Cash on delivery is available on orders up to ₹10,000.</p>
        <h2>Timelines</h2>
        <ul>
          <li>Metro cities: 2–3 working days</li>
          <li>Tier 2 and 3 cities: 3–5 working days</li>
          <li>Remote pincodes: 5–8 working days</li>
          <li>Bulky items such as cots and high chairs: 5–10 working days</li>
        </ul>
        <h2>Tracking</h2>
        <p>You will receive a tracking link by SMS and email once your order is dispatched. Live status is also available under Your Orders.</p>
    </>
  );
}
