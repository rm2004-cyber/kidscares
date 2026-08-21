"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginHref, useAuth } from "@/store/useAuth";

/**
 * Wraps a screen that requires a signed-in visitor.
 *
 * Waits for the session check to finish before deciding — otherwise the first
 * paint would always look signed-out and bounce a legitimately signed-in
 * visitor to the login page.
 *
 * This is a UX gate, not a security boundary: the markup still reaches the
 * client. The API enforces the real rule on every request.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(loginHref(pathname));
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 py-20 text-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
        <p className="text-sm font-semibold text-ink-soft">
          {ready ? "Taking you to sign in\u2026" : "Checking your session\u2026"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
