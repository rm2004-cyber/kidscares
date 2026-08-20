import type { OrderStatus } from "@/lib/admin/types";
import { Badge } from "./ui";

const MAP: Record<OrderStatus, { tone: Parameters<typeof Badge>[0]["tone"]; label: string }> = {
  pending: { tone: "sun", label: "Pending" },
  confirmed: { tone: "sky", label: "Confirmed" },
  packed: { tone: "grape", label: "Packed" },
  shipped: { tone: "brand", label: "Shipped" },
  delivered: { tone: "mint", label: "Delivered" },
  cancelled: { tone: "red", label: "Cancelled" },
  returned: { tone: "neutral", label: "Returned" },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { tone, label } = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}
