import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { CheckoutView } from "./CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your KidsCares order.",
  robots: { index: false, follow: false },
};

/**
 * The bag itself stays open to guests — only checkout requires a session, so
 * a visitor can shop freely and is asked to sign in once, at the point it
 * actually matters.
 */
export default function CheckoutPage() {
  return (
    <AuthGate>
      <CheckoutView />
    </AuthGate>
  );
}
