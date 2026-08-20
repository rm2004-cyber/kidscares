import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/layout/Logo";
import { Activity, Flame, Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — hidden on small screens where it would just push the
          form below the fold. */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-grape-500/20 blur-3xl" />

        {/* The artwork is dark-on-transparent, so on the ink panel it sits on
            a light plate rather than being recoloured. */}
        <span className="relative w-fit rounded-2xl bg-white/95 px-4 py-3">
          <Logo variant="full" size="lg" href={null} />
        </span>

        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
            Everything for kids,
            <br />
            managed in one place.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            Products, categories, banners, deals and live traffic — all editable
            without a deploy.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              { icon: Package, text: "Full catalogue control with per-product SEO" },
              { icon: Flame, text: "Schedule deals and countdown timers" },
              { icon: Activity, text: "Watch visitors on the site in real time" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Icon className="size-4.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">
          © {new Date().getFullYear()} KidsCares. Admin access is logged.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-cream px-4 py-12">
        <LoginForm />
      </main>
    </div>
  );
}
