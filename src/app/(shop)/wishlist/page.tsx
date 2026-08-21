import type { Metadata } from "next";
import { WishlistView } from "./WishlistView";

export const metadata: Metadata = {
  title: "Your Wishlist",
  description: "Everything you have saved at KidsCares.",
  // Personal, per-visitor content — nothing here belongs in the index.
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return <WishlistView />;
}
