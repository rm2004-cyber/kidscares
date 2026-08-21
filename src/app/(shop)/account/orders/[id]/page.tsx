import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { OrderDetailView } from "./OrderDetailView";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthGate>
      <OrderDetailView orderId={id} />
    </AuthGate>
  );
}
