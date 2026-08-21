"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adminAuthApi } from "@/utils/service";

export type Admin = { _id: string; name: string; email: string; role: string };

/**
 * Guards the admin shell.
 *
 * Checks the session once and bounces to the login screen when there is none,
 * instead of letting every panel render and then fail its own request with a
 * 401 the visitor has to read.
 *
 * A UX gate only — the API enforces the real rule on every admin route.
 */
export function AdminGate({
  children,
}: {
  children: (admin: Admin) => React.ReactNode;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    adminAuthApi
      .me()
      .then((data) => {
        if (cancelled) return;
        setAdmin(data?.admin ?? null);
        if (!data?.admin) router.replace("/admin/login");
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin/login");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !admin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream text-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
        <p className="text-sm font-semibold text-ink-soft">
          {checking ? "Checking your session…" : "Taking you to sign in…"}
        </p>
      </div>
    );
  }

  return <>{children(admin)}</>;
}
