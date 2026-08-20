import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { AccountSettingsView } from "./SettingsView";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default function AccountSettingsPage() {
  return (
    <AuthGate>
      <AccountSettingsView />
    </AuthGate>
  );
}
