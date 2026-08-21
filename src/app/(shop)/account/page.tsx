import type { Metadata } from "next";
import { AccountHome } from "./AccountHome";

export const metadata: Metadata = {
  title: "Your Account",
  description: "Manage your KidsCares orders, addresses and preferences.",
  robots: { index: false, follow: false },
};

/**
 * Open to guests on purpose: the tiles double as the sign-in entry point, so
 * there is one "Account" destination in the header rather than two.
 */
export default function AccountPage() {
  return <AccountHome />;
}
