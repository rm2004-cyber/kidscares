import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Careers at KidsCares",
  description: "Open roles and what it is like to work here.",
  path: "/careers",
});

export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Careers at KidsCares
      </h1>
      <p className="!text-base !text-ink-soft">Open roles and what it is like to work here.</p>
        <h2>Why work here</h2>
        <p>Small team, real ownership, and a product that people use for the most important purchases they make. We ship weekly and review honestly.</p>
        <h2>Open roles</h2>
        <ul>
          <li>Senior Frontend Engineer — Mohali or remote</li>
          <li>Category Manager, Toys — Mohali</li>
          <li>Customer Experience Associate — Mohali</li>
          <li>Supply Chain Analyst — remote</li>
        </ul>
        <h2>How to apply</h2>
        <p>Send a short note about what you have built to careers@kidscares.example. No cover letter templates, please — we read every message.</p>
    </>
  );
}
