import Link from "next/link";
import { ArrowLeft, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Backdrop } from "@/components/layout/Backdrop";

const POINTS = [
  { icon: Truck, text: "Free delivery on orders above ₹999" },
  { icon: RotateCcw, text: "30-day returns with free pickup" },
  { icon: ShieldCheck, text: "Every toy age-graded and safety tested" },
];

/**
 * Auth shell. Deliberately outside the `(shop)` group so these screens render
 * without the header, footer and bottom tab bar — nothing to navigate to
 * until the visitor is signed in.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Backdrop />

      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo size="md" />
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
        >
          <ArrowLeft className="size-3.5" />
          Back to store
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-white p-6 shadow-[0_24px_60px_-32px_rgba(23,32,46,0.3)] sm:p-8">
            {children}
          </div>

          <ul className="mt-6 space-y-2">
            {POINTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2 text-xs font-semibold text-ink-soft"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-brand-500 ring-1 ring-line">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
