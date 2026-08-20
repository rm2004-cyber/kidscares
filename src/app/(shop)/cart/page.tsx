import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = {
  title: "Your Bag",
  description: "Review the items in your KidsCares bag before checkout.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartView />;
}
