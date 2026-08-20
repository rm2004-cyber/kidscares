import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Returns & Refunds",
  description: "How to return an item and when your refund arrives.",
  path: "/help/returns",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Returns & Refunds
      </h1>
      <p className="!text-base !text-ink-soft">How to return an item and when your refund arrives.</p>
        <h2>Return window</h2>
        <p>30 days from delivery for most products. Free pickup from your delivery address — you do not need the original packaging, only the tags.</p>
        <h2>What cannot be returned</h2>
        <ul>
          <li>Opened diapers, wipes and feeding teats</li>
          <li>Personal care products once the seal is broken</li>
          <li>Innerwear and swimwear</li>
          <li>Customised or personalised items</li>
        </ul>
        <h2>Refund timeline</h2>
        <p>Once the item reaches our warehouse and passes a quality check, refunds are issued to the original payment method within 3–5 working days. COD orders are refunded to a bank account you provide.</p>
    </>
  );
}
