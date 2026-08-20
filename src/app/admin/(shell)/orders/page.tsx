import { OrdersView } from "./OrdersView";
import { orders } from "@/lib/admin/mock";

export const metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return <OrdersView orders={orders} />;
}
