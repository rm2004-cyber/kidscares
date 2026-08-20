import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { AddressesView } from "./AddressesView";

export const metadata: Metadata = {
  title: "Your Addresses",
  description: "Manage your saved delivery addresses.",
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <AuthGate>
      <AddressesView />
    </AuthGate>
  );
}
