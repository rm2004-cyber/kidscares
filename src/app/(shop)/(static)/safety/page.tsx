import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Toy & Product Safety Standards",
  description: "The certifications, age grades and material standards every KidsCares product must meet.",
  path: "/safety",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Toy & Product Safety Standards
      </h1>
      <p className="!text-base !text-ink-soft">The certifications, age grades and material standards every KidsCares product must meet.</p>
        <h2>Certification we require</h2>
        <p>Toys sold on KidsCares are tested against IS 9873 (BIS) and ISO 8124, covering mechanical and physical properties, flammability and migration of certain elements. Textiles carry OEKO-TEX Standard 100 certification.</p>
        <h2>Age grading</h2>
        <ul>
          <li>0–6 months: no small parts, no loose fibres, machine washable</li>
          <li>6–24 months: choking-hazard tested, rounded edges, non-toxic paint</li>
          <li>2–4 years: small parts permitted only where clearly labelled</li>
          <li>4+ years: standard grading with printed age guidance</li>
        </ul>
        <h2>Choking hazard notice</h2>
        <p>Products containing small parts are not suitable for children under 3 years. This warning appears on every affected product page and on the packaging.</p>
        <h2>Reporting a concern</h2>
        <p>If you believe a product is unsafe, email care@kidscares.example with the order number and photographs. We respond within one working day and withdraw the listing while we investigate.</p>
    </>
  );
}
