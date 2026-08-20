import { AccountNav } from "./AccountNav";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-6">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
