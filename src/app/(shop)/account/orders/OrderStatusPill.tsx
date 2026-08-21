import { Check, PackageX, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  placed: { label: "Placed", className: "bg-cream text-ink-soft" },
  confirmed: { label: "Confirmed", className: "bg-sky-ks/12 text-sky-ks" },
  packed: { label: "Packed", className: "bg-grape-100 text-grape-600" },
  shipped: { label: "Shipped", className: "bg-sun-100 text-amber-700" },
  "in-transit": { label: "In transit", className: "bg-sun-100 text-amber-700" },
  "out-for-delivery": { label: "Out for delivery", className: "bg-brand-50 text-brand-700" },
  delivered: { label: "Delivered", className: "bg-mint-100 text-mint-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600" },
  returned: { label: "Returned", className: "bg-cream text-ink-soft" },
  rto: { label: "Returning", className: "bg-red-50 text-red-600" },
};

/**
 * Accepts any status string rather than a fixed union: the API adds courier
 * states over time, and an unknown one should render plainly instead of
 * throwing.
 */
export function OrderStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const entry = MAP[status] ?? {
    label: status.replace(/-/g, " "),
    className: "bg-cream text-ink-soft",
  };

  const Icon =
    status === "delivered" ? Check
      : status === "cancelled" || status === "rto" ? PackageX
      : Truck;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold capitalize",
        entry.className,
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={3} />
      {entry.label}
    </span>
  );
}
