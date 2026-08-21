"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Copy,
  Eye,
  Filter,
  Pencil,
  Plus,
  PackageOpen,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import type { Product } from "@/lib/types";
import { adminApi, ApiError } from "@/utils/service";
import { discountPct, inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  /* Filtering and sorting happen server-side so the page never holds the whole
     catalogue in memory — this list is paginated by the API. */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listProducts({
        q: q || undefined,
        brand: brand || undefined,
        category: category || undefined,
        sort: sort === "newest" ? "new" : sort === "title" ? undefined : sort,
        page,
        limit: PAGE_SIZE,
      });
      let list = (res?.data ?? []) as Product[];
      if (stock === "in") list = list.filter((p) => p.inStock);
      if (stock === "out") list = list.filter((p) => !p.inStock);
      if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
      setProducts(list);
      setTotal(res?.meta?.total ?? list.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [q, brand, category, stock, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminApi.listBrands().then((b) => setBrands((b ?? []).map((x: { name: string }) => x.name))).catch(() => {});
    adminApi
      .listCategories()
      .then((c) =>
        setCategories(
          ((c ?? []) as { slug: string; name: string; parent: string | null }[])
            .filter((x) => x.parent === null)
            .map((x) => ({ slug: x.slug, name: x.name })),
        ),
      )
      .catch(() => {});
  }, []);

  const remove = async (id: string) => {
    try {
      await adminApi.deleteProduct(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  const rows = products;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.includes(r._id));

  const activeFilters = [brand, category, stock].filter(Boolean).length;

  const reset = () => {
    setQ("");
    setBrand("");
    setCategory("");
    setStock("");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={loading ? "Loading…" : `${total} products in the catalogue`}
        actions={
          <>
            <Button variant="secondary" size="sm">
              Import CSV
            </Button>
            <Link href="/admin/products/new">
              <Button size="sm">
                <Plus className="size-4" />
                Add product
              </Button>
            </Link>
          </>
        }
      />

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <Card bodyClassName="p-3 sm:p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product or brand…"
              aria-label="Search products"
              className="h-10 w-full rounded-xl border border-line bg-cream pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-4">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              aria-label="Filter by category"
              className="!py-2 text-xs"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>

            <Select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1); }}
              aria-label="Filter by brand"
              className="!py-2 text-xs"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>

            <Select
              value={stock}
              onChange={(e) => { setStock(e.target.value); setPage(1); }}
              aria-label="Filter by stock"
              className="!py-2 text-xs"
            >
              <option value="">Any stock</option>
              <option value="in">In stock</option>
              <option value="out">Out of stock</option>
            </Select>

            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="!py-2 text-xs"
            >
              <option value="newest">Newest</option>
              <option value="title">Name A–Z</option>
              <option value="price-asc">Price low → high</option>
              <option value="price-desc">Price high → low</option>
              <option value="rating">Rating</option>
            </Select>
          </div>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0">
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-xs font-bold text-brand-700">
            {selected.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">Publish</Button>
            <Button variant="secondary" size="sm">Unpublish</Button>
            <Button variant="danger" size="sm">
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Card className="mt-3" bodyClassName="p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No products match"
            copy="Try a different search term or clear the filters."
            action={
              <Button variant="secondary" size="sm" onClick={reset}>
                <Filter className="size-3.5" />
                Clear filters
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <table className="min-w-full">
              <thead className="border-b border-line bg-cream/60">
                <tr>
                  <Th className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, ...rows.map((r) => r._id)])]
                            : prev.filter((id) => !rows.some((r) => r._id === id)),
                        )
                      }
                      className="size-3.5 accent-[var(--color-brand-500)]"
                    />
                  </Th>
                  <Th>Product</Th>
                  <Th className="hidden md:table-cell">Category</Th>
                  <Th className="hidden lg:table-cell">Price</Th>
                  <Th className="hidden sm:table-cell">Stock</Th>
                  <Th className="hidden xl:table-cell">Rating</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p._id} className="transition hover:bg-cream/50">
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.title}`}
                        checked={selected.includes(p._id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, p._id]
                              : prev.filter((id) => id !== p._id),
                          )
                        }
                        className="size-3.5 accent-[var(--color-brand-500)]"
                      />
                    </Td>

                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream">
                          <Image src={p.images[0]} alt="" fill unoptimized sizes="44px" className="object-cover" />
                        </span>
                        <div className="min-w-0 max-w-[240px]">
                          <p className="truncate text-xs font-bold text-ink">{p.title}</p>
                          <p className="truncate text-[11px] text-ink-muted">{p.brand}</p>
                          {/* Price is shown inline on small screens where the
                              dedicated column is hidden. */}
                          <p className="mt-0.5 text-[11px] font-bold text-ink lg:hidden">
                            {inr(p.price)}
                          </p>
                        </div>
                      </div>
                    </Td>

                    <Td className="hidden md:table-cell">
                      <span className="text-[11px] text-ink-soft">
                        {p.categorySlug.replace(/-/g, " ")}
                      </span>
                    </Td>

                    <Td className="hidden lg:table-cell">
                      <p className="text-xs font-bold">{inr(p.price)}</p>
                      <p className="text-[11px] text-ink-muted line-through">
                        {inr(p.mrp)}
                      </p>
                      <Badge tone="mint" className="mt-0.5">
                        {discountPct(p.mrp, p.price)}% off
                      </Badge>
                    </Td>

                    <Td className="hidden sm:table-cell">
                      {p.inStock ? (
                        <Badge tone="mint">In stock</Badge>
                      ) : (
                        <Badge tone="red">Out of stock</Badge>
                      )}
                    </Td>

                    <Td className="hidden xl:table-cell">
                      <span className="text-xs font-semibold">
                        <Star className="inline size-3 fill-sun-400 text-sun-400" />{" "}
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="ml-1 text-[11px] text-ink-muted">
                        ({p.reviewCount})
                      </span>
                    </Td>

                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        <IconAction label="Preview" href={`/product/${p.slug}`} external>
                          <Eye className="size-4" />
                        </IconAction>
                        <IconAction label="Edit" href={`/admin/products/${p._id}`}>
                          <Pencil className="size-4" />
                        </IconAction>
                        <IconAction label="Duplicate">
                          <Copy className="size-4" />
                        </IconAction>
                        <IconAction label="Delete" danger>
                          <Trash2 className="size-4" />
                        </IconAction>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        {total > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <p className="text-xs text-ink-muted">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => Math.abs(n - safePage) < 3 || n === 1 || n === pageCount)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center">
                    {i > 0 && arr[i - 1] !== n - 1 && (
                      <span className="px-1 text-xs text-ink-muted">…</span>
                    )}
                    <button
                      onClick={() => setPage(n)}
                      aria-current={n === safePage ? "page" : undefined}
                      className={cn(
                        "size-8 rounded-lg text-xs font-bold transition",
                        n === safePage
                          ? "bg-brand-500 text-white"
                          : "text-ink-soft hover:bg-cream",
                      )}
                    >
                      {n}
                    </button>
                  </span>
                ))}
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage === pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function IconAction({
  label,
  href,
  external,
  danger,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  external?: boolean;
  danger?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className = cn(
    "grid size-8 place-items-center rounded-lg transition",
    danger
      ? "text-ink-muted hover:bg-red-50 hover:text-red-600"
      : "text-ink-muted hover:bg-cream hover:text-ink",
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        className={className}
        {...(external ? { target: "_blank" } : {})}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}
