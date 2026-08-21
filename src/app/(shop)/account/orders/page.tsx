import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = {
  title: "Your Orders",
  description: "Track, return or reorder from your KidsCares order history.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <AuthGate>
      <OrdersView />
    </AuthGate>
  );
}
