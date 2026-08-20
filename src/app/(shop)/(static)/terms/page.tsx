import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "The terms that apply when you shop at KidsCares.",
  path: "/terms",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Terms & Conditions
      </h1>
      <p className="!text-base !text-ink-soft">The terms that apply when you shop at KidsCares.</p>
        <h2>Orders</h2>
        <p>An order is an offer to buy. It is accepted once we confirm dispatch. If an item is mispriced or unavailable we will cancel and refund in full.</p>
        <h2>Pricing</h2>
        <p>All prices are in Indian Rupees and inclusive of applicable taxes. Delivery charges, where they apply, are shown before payment.</p>
        <h2>Returns</h2>
        <p>Most items can be returned within 30 days in their original condition. For hygiene reasons, opened diapers, wipes, feeding teats and personal care products cannot be returned unless faulty.</p>
        <h2>Liability</h2>
        <p>Nothing in these terms limits your statutory rights as a consumer under Indian law.</p>
    </>
  );
}
