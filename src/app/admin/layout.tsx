import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | KidsCares Admin" },
  // The whole admin surface stays out of every index.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Metadata only. The chrome lives in `(shell)/layout.tsx` so that `/admin/login`
 * — which sits outside that group — renders without a sidebar the visitor has
 * no session for.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
