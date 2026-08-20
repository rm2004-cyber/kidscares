import { AdminShell } from "@/components/admin/AdminShell";

/** Sidebar + topbar chrome for every authenticated admin screen. */
export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
