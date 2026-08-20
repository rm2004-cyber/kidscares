import type { Metadata } from "next";
import { WishlistView } from "./WishlistView";
import { getAllProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Your Wishlist",
  description: "Everything you have saved at KidsCares.",
  // Personal, per-visitor content — nothing here belongs in the index.
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  // The full catalogue is passed down and filtered client-side against the
  // persisted id list; wishlist state lives in localStorage, not on the server.
  const products = await getAllProducts();
  return <WishlistView products={products} />;
}
