import { SettingsView } from "./SettingsView";
import { defaultSettings } from "@/lib/admin/mock";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return <SettingsView initial={defaultSettings} />;
}
