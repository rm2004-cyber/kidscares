import {
  Badge,
  Card,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { orders } from "@/lib/admin/mock";
import { inr } from "@/lib/data";

export const metadata = { title: "Customers" };

export default function AdminCustomersPage() {
  /* Customers are derived from orders here. Once Mongo is wired this becomes
     a real collection with its own addresses and auth records. */
  const byEmail = new Map<
    string,
    { name: string; email: string; phone: string; city: string; orders: number; spent: number; last: string }
  >();

  for (const o of orders) {
    const hit = byEmail.get(o.customer.email);
    if (hit) {
      hit.orders++;
      hit.spent += o.total;
      if (o.placedAt > hit.last) hit.last = o.placedAt;
    } else {
      byEmail.set(o.customer.email, {
        name: o.customer.name,
        email: o.customer.email,
        phone: o.customer.phone,
        city: o.city,
        orders: 1,
        spent: o.total,
        last: o.placedAt,
      });
    }
  }

  const rows = [...byEmail.values()].sort((a, b) => b.spent - a.spent);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customers who have ordered at least once`}
      />

      <Card bodyClassName="p-0 sm:p-0">
        <TableWrap>
          <table className="min-w-full">
            <thead className="border-b border-line bg-cream/60">
              <tr>
                <Th>Customer</Th>
                <Th className="hidden md:table-cell">Contact</Th>
                <Th className="hidden sm:table-cell">City</Th>
                <Th className="text-center">Orders</Th>
                <Th className="hidden lg:table-cell">Last order</Th>
                <Th className="text-right">Lifetime value</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.email} className="transition hover:bg-cream/50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{c.name}</p>
                        <p className="truncate text-[11px] text-ink-muted md:hidden">
                          {c.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <p className="text-xs">{c.email}</p>
                    <p className="text-[11px] text-ink-muted">{c.phone}</p>
                  </Td>
                  <Td className="hidden text-xs text-ink-soft sm:table-cell">{c.city}</Td>
                  <Td className="text-center">
                    <Badge tone={c.orders > 2 ? "mint" : "neutral"}>{c.orders}</Badge>
                  </Td>
                  <Td className="hidden text-xs text-ink-soft lg:table-cell">
                    {new Date(c.last).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Td>
                  <Td className="text-right font-bold">{inr(c.spent)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
