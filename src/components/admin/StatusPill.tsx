import type { OrderStatus } from "@/lib/admin/types";
import { Badge } from "./ui";

const MAP: Record<string, { tone: Parameters<typeof Badge>[0]["tone"]; label: string }> = {
  placed: { tone: "sun", label: "Placed" },
  confirmed: { tone: "sky", label: "Confirmed" },
  packed: { tone: "grape", label: "Packed" },
  shipped: { tone: "brand", label: "Shipped" },
  "in-transit": { tone: "brand", label: "In transit" },
  "out-for-delivery": { tone: "brand", label: "Out for delivery" },
  delivered: { tone: "mint", label: "Delivered" },
  cancelled: { tone: "red", label: "Cancelled" },
  returned: { tone: "neutral", label: "Returned" },
  rto: { tone: "red", label: "Returning" },
};

export function StatusPill({ status }: { status: OrderStatus | string }) {
  const entry = MAP[status] ?? { tone: "neutral" as const, label: String(status) };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
