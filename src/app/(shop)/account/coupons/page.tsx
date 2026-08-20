import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { CouponsView } from "./CouponsView";

export const metadata: Metadata = {
  title: "Coupons & Offers",
  description: "Coupon codes available on your KidsCares account.",
  robots: { index: false, follow: false },
};

export default function CouponsPage() {
  return (
    <AuthGate>
      <CouponsView />
    </AuthGate>
  );
}
