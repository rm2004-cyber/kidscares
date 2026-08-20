"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginHref, useAuth } from "@/store/useAuth";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Wraps a screen that requires a signed-in visitor.
 *
 * Renders a spinner until the persisted session has hydrated — otherwise the
 * first paint would always look signed-out and would bounce a legitimately
 * signed-in visitor to the login page.
 *
 * This is a UX gate, not a security boundary: the markup still reaches the
 * client. Real protection arrives with server-side session checks.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !user) router.replace(loginHref(pathname));
  }, [hydrated, user, router, pathname]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 py-20 text-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
        <p className="text-sm font-semibold text-ink-soft">
          {hydrated ? "Taking you to sign in…" : "Checking your session…"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
