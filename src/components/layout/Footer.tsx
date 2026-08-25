import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Undo2 } from "lucide-react";
import type { AgeGroup, Category } from "@/lib/types";
import { Logo } from "./Logo";

/* lucide-react dropped brand glyphs, so the social marks are inlined. */
const SOCIALS = [
  {
    label: "Instagram",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0 6.1a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4m0 6.1a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8m4.8-6.3a.87.87 0 1 1-1.73 0 .87.87 0 0 1 1.73 0",
  },
  {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12",
  },
  {
    label: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8M10 15.1V8.9l5.2 3.1z",
  },
];

const HELP_LINKS = [
  { label: "Track Your Order", href: "/account/orders" },
  { label: "Your Coupons", href: "/account/coupons" },
  { label: "Shipping & Delivery", href: "/help/shipping" },
  { label: "Returns & Refunds", href: "/help/returns" },
  { label: "Size Guide", href: "/help/size-guide" },
  { label: "Contact Us", href: "/help/contact" },
];

const COMPANY_LINKS = [
  { label: "About KidsCares", href: "/about" },
  { label: "Toy Safety Standards", href: "/safety" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Careers", href: "/careers" },
];

const TRUST = [
  { icon: Truck, title: "Free delivery", sub: "On orders above ₹999" },
  { icon: Undo2, title: "30-day returns", sub: "No questions asked" },
  { icon: ShieldCheck, title: "Safety tested", sub: "Every toy age-graded" },
];

export function Footer({
  topCategories,
  ageGroups,
}: {
  topCategories: Category[];
  ageGroups: AgeGroup[];
}) {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 border-b border-line py-8 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-ink-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo variant="full" size="lg" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              Everything for kids, in one place — clothing, footwear, toys, soft toys
              and daily essentials. Every product age-graded, safety tested and picked
              by parents who use it themselves.
            </p>

            <div className="mt-5 space-y-2 text-sm text-ink-soft">
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-brand-500" /> 1800-123-4567
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-brand-500" /> care@kidscares.example
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-brand-500" /> Mohali, Punjab, India
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={`KidsCares on ${s.label}`}
                  className="grid size-9 place-items-center rounded-full border border-line transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Shop">
            {topCategories.slice(0, 6).map((c) => (
              <FooterLink key={c._id} href={`/category/${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Shop by Age">
            {ageGroups.map((a) => (
              <FooterLink key={a._id} href={`/age/${a.slug}`}>
                {a.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Help">
            {HELP_LINKS.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Company">
            {COMPANY_LINKS.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterCol>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-line py-5 text-xs text-ink-muted sm:flex-row">
          <p>© {new Date().getFullYear()} KidsCares. All rights reserved.</p>
          <p>Prices inclusive of all taxes. Images are illustrative.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold text-ink">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      {/* Padded to a real finger-sized target. The text is only ~19px tall, and
          a stack of links that close together is the classic footer mis-tap. */}
      <Link
        href={href}
        className="-mx-1 inline-block min-h-11 px-1 py-2.5 text-sm leading-6 text-ink-soft transition hover:text-brand-600 sm:min-h-0 sm:py-1"
      >
        {children}
      </Link>
    </li>
  );
}
