import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Size Guide",
  description: "Age-to-size conversion charts for clothing and footwear.",
  path: "/help/size-guide",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Size Guide
      </h1>
      <p className="!text-base !text-ink-soft">Age-to-size conversion charts for clothing and footwear.</p>
        <h2>Clothing by age</h2>
        <ul>
          <li>0–3 M: height 50–60 cm, chest 40–43 cm</li>
          <li>3–6 M: height 60–68 cm, chest 43–46 cm</li>
          <li>6–12 M: height 68–76 cm, chest 46–48 cm</li>
          <li>1–2 Y: height 76–88 cm, chest 48–51 cm</li>
          <li>2–3 Y: height 88–96 cm, chest 51–53 cm</li>
          <li>3–4 Y: height 96–104 cm, chest 53–55 cm</li>
          <li>4–5 Y: height 104–110 cm, chest 55–57 cm</li>
        </ul>
        <h2>Footwear</h2>
        <ul>
          <li>UK 3: foot length 11.5 cm, approx 6–12 months</li>
          <li>UK 5: foot length 12.8 cm, approx 12–18 months</li>
          <li>UK 7: foot length 14.2 cm, approx 2–3 years</li>
          <li>UK 9: foot length 15.5 cm, approx 3–4 years</li>
          <li>UK 11: foot length 17.0 cm, approx 5–6 years</li>
          <li>UK 13: foot length 18.5 cm, approx 7–8 years</li>
        </ul>
        <h2>How to measure</h2>
        <p>Stand your child against a wall on a sheet of paper, mark the heel and the longest toe, then measure the distance. Add 0.5 cm of growing room and pick the nearest size up.</p>
    </>
  );
}
