import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description: "Reach the KidsCares support team.",
  path: "/help/contact",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Contact Us
      </h1>
      <p className="!text-base !text-ink-soft">Reach the KidsCares support team.</p>
        <h2>Customer care</h2>
        <p>Phone 1800-123-4567, Monday to Saturday, 9am–8pm IST. Email care@kidscares.example — we reply within one working day.</p>
        <h2>Order queries</h2>
        <p>Have your order number ready. Most delivery and return questions can be resolved instantly under Your Orders.</p>
        <h2>Registered office</h2>
        <p>KidsCares Retail Private Limited, Sector 74, Mohali, Punjab 160055, India.</p>
    </>
  );
}
