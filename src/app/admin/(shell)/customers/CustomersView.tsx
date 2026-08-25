"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";

import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";

type Customer = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  addresses?: { city?: string }[];
};

/**
 * Customer directory.
 *
 * Reads the User collection directly rather than deriving people from orders —
 * someone who has registered but not yet bought is still a customer worth
 * seeing, and the old derivation hid them entirely.
 */
export function CustomersView() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listCustomers({ q: q || undefined, page, limit: 25 });
      setRows((res?.data ?? []) as Customer[]);
      setTotal(res?.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={loading ? "Loading…" : `${total} registered customers`}
      />

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <Card bodyClassName="p-3 sm:p-3" className="mb-3">
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email or phone…"
            aria-label="Search customers"
            className="h-10 w-full rounded-xl border border-line bg-cream pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
          />
        </label>
      </Card>

      <Card bodyClassName="p-0 sm:p-0">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            copy="Everyone who creates an account will show up here."
          />
        ) : (
          <>
            {/* One card per customer below sm — the email is the thing an admin
                looks people up by, and it is the first casualty of a squeezed
                table column. */}
            <ul className="divide-y divide-line sm:hidden">
              {rows.map((c) => (
                <li key={c._id} className="flex items-start gap-2.5 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{c.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">{c.email}</p>
                    <p className="text-[11px] text-ink-muted">
                      {c.phone ?? "No phone"}
                      {c.addresses?.[0]?.city ? ` · ${c.addresses[0].city}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={c.status === "active" ? "mint" : "red"}>{c.status}</Badge>
                      {c.emailVerified && <Badge tone="sky">Verified</Badge>}
                      <span className="ml-auto text-[10px] text-ink-muted">
                        {new Date(c.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block">
              <TableWrap>
                <table className="min-w-full">
                  <thead className="border-b border-line bg-cream/60">
                <tr>
                  <Th>Customer</Th>
                  <Th className="hidden md:table-cell">Contact</Th>
                  <Th className="hidden sm:table-cell">City</Th>
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">Joined</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => (
                  <tr key={c._id} className="transition hover:bg-cream/50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                          {c.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
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
                      <p className="text-[11px] text-ink-muted">{c.phone ?? "—"}</p>
                    </Td>
                    <Td className="hidden text-xs text-ink-soft sm:table-cell">
                      {c.addresses?.[0]?.city ?? "—"}
                    </Td>
                    <Td>
                      <Badge tone={c.status === "active" ? "mint" : "red"}>
                        {c.status}
                      </Badge>
                      {c.emailVerified && (
                        <Badge tone="sky" className="ml-1">
                          Verified
                        </Badge>
                      )}
                    </Td>
                    <Td className="hidden text-xs text-ink-soft lg:table-cell">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                  </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <p className="text-xs text-ink-muted">
              Page {page} of {pages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
