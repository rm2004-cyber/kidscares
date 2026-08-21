import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderSuccessView } from "./OrderSuccessView";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-14"><div className="skeleton h-64 rounded-card" /></div>}>
      <OrderSuccessView />
    </Suspense>
  );
}
