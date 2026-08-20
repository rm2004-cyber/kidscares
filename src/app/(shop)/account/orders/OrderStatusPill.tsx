import { Check, PackageX, Truck } from "lucide-react";
import type { OrderStatus } from "@/lib/account/types";
import { cn } from "@/lib/utils";

const MAP: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: "Placed", className: "bg-cream text-ink-soft" },
  confirmed: { label: "Confirmed", className: "bg-sky-ks/12 text-sky-ks" },
  packed: { label: "Packed", className: "bg-grape-100 text-grape-600" },
  shipped: { label: "Shipped", className: "bg-sun-100 text-amber-700" },
  "out-for-delivery": {
    label: "Out for delivery",
    className: "bg-brand-50 text-brand-700",
  },
  delivered: { label: "Delivered", className: "bg-mint-100 text-mint-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600" },
};

export function OrderStatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, className: tone } = MAP[status];
  const Icon =
    status === "delivered" ? Check : status === "cancelled" ? PackageX : Truck;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold",
        tone,
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={3} />
      {label}
    </span>
  );
}
