"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Folder, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/admin/ui";
import { ImageManager } from "@/components/admin/ImageManager";
import { SeoEditor, type SeoValue } from "@/components/admin/SeoEditor";
import type { Category } from "@/lib/types";
import { adminApi, ApiError } from "@/utils/service";
import { toMedia, type MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

const ACCENTS = ["brand", "mint", "sun", "grape", "sky"];

type Row = Omit<Category, "image"> & { image?: MediaItem; seoValue: SeoValue };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9/]+/g, "-").replace(/^-|-$/g, "");

const withSeo = (raw: unknown): Row => {
  const c = raw as Category & { image?: unknown };
  return {
  ...c,
  image: toMedia(c.image)[0],
  seoValue: {
    title: c.seo?.title ?? "",
    description: c.seo?.description ?? "",
    keywords: c.seo?.keywords ?? [],
    canonical: c.seo?.canonical ?? "",
    index: c.seo?.index ?? true,
    follow: c.seo?.follow ?? true,
  },
  };
};

export function CategoriesView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await adminApi.listCategories()) as unknown[];
      setRows((list ?? []).map(withSeo));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);

  const tops = useMemo(
    () =>
      rows.filter(
        (c) =>
          c.parent === null &&
          (!q || c.name.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, q],
  );

  const childrenOf = (slug: string) => rows.filter((c) => c.parent === slug);

  const blank = (parent: string | null = null): Row => ({
    _id: `c${Date.now()}`,
    slug: "",
    name: "",
    parent,
    image: undefined,
    accent: "brand",
    productCount: 0,
    blurb: "",
    seoValue: { title: "", description: "", keywords: [], canonical: "", index: true, follow: true },
  });

  const upsert = async (row: Row) => {
    const payload = {
      name: row.name,
      slug: row.slug,
      parent: row.parent,
      blurb: row.blurb,
      glyph: row.glyph,
      accent: row.accent,
      seo: row.seoValue,
      ...(row.image ? { image: row.image } : {}),
    };

    setError("");
    try {
      // A brand-new row still carries the client-side id it was created with,
      // so existence is decided by whether the server already knows it.
      const known = rows.some((r) => r._id === row._id) && !row._id.startsWith("c1");
      if (known && !row._id.startsWith("c")) {
        await adminApi.updateCategory(row._id, payload);
      } else if (/^[a-f\d]{24}$/i.test(row._id)) {
        await adminApi.updateCategory(row._id, payload);
      } else {
        await adminApi.createCategory(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await adminApi.deleteCategory(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle={loading ? "Loading…" : `${rows.length} categories · ${tops.length} top-level aisles`}
        actions={
          <Button size="sm" onClick={() => setEditing(blank())}>
            <Plus className="size-4" />
            Add category
          </Button>
        }
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            aria-label="Search categories"
            className="h-10 w-full rounded-xl border border-line bg-cream pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
          />
        </label>
      </Card>

      <div className="space-y-2">
        {tops.map((c) => {
          const kids = childrenOf(c.slug);
          const open = expanded.includes(c.slug);

          return (
            <Card key={c._id} bodyClassName="p-0 sm:p-0">
              <div className="flex items-center gap-3 p-3">
                {kids.length > 0 ? (
                  <button
                    onClick={() =>
                      setExpanded((prev) =>
                        open ? prev.filter((s) => s !== c.slug) : [...prev, c.slug],
                      )
                    }
                    aria-label={open ? "Collapse" : "Expand"}
                    aria-expanded={open}
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-cream"
                  >
                    <ChevronRight
                      className={cn("size-4 transition-transform", open && "rotate-90")}
                    />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" />
                )}

                <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {c.image ? (
                    <Image src={c.image?.url ?? ""} alt="" fill unoptimized sizes="44px" className="object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center"><Folder className="size-5 text-ink-muted" /></span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">/category/{c.slug}</p>
                </div>

                <Badge tone="neutral" className="hidden sm:inline-flex">
                  {c.productCount} products
                </Badge>
                {kids.length > 0 && (
                  <Badge tone="sky" className="hidden md:inline-flex">
                    {kids.length} sub
                  </Badge>
                )}

                <div className="flex shrink-0 items-center gap-0.5">
                  <IconBtn label="Add subcategory" onClick={() => setEditing(blank(c.slug))}>
                    <Plus className="size-4" />
                  </IconBtn>
                  <IconBtn label="Edit" onClick={() => setEditing(c)}>
                    <Pencil className="size-4" />
                  </IconBtn>
                  <IconBtn
                    label="Delete"
                    danger
                    onClick={() => void remove(c._id)}
                  >
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {open && kids.length > 0 && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-line bg-cream/40"
                  >
                    {kids.map((k) => (
                      <li
                        key={k._id}
                        className="flex items-center gap-3 border-b border-line/60 py-2.5 pl-14 pr-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink">{k.name}</p>
                          <p className="truncate text-[11px] text-ink-muted">
                            /category/{k.slug}
                          </p>
                        </div>
                        <Badge tone="neutral">{k.productCount}</Badge>
                        <IconBtn label="Edit" onClick={() => setEditing(k)}>
                          <Pencil className="size-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Delete"
                          danger
                          onClick={() => void remove(k._id)}
                        >
                          <Trash2 className="size-3.5" />
                        </IconBtn>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <CategorySheet
        row={editing}
        parents={rows.filter((r) => r.parent === null)}
        onClose={() => setEditing(null)}
        onSave={upsert}
      />
    </>
  );
}

function CategorySheet({
  row,
  parents,
  onClose,
  onSave,
}: {
  row: Row | null;
  parents: Row[];
  onClose: () => void;
  onSave: (r: Row) => void;
}) {
  const [draft, setDraft] = useState<Row | null>(row);
  if (row && draft?._id !== row._id) setDraft(row);

  return (
    <AnimatePresence>
      {row && draft && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white"
            role="dialog"
            aria-label="Edit category"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">
                {draft.name || "New category"}
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Name" required>
                <Input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const base = slugify(name);
                    setDraft({
                      ...draft,
                      name,
                      // Child slugs are nested under the parent so the URL
                      // reads /category/clothing/dresses.
                      slug: draft.parent ? `${draft.parent}/${base}` : base,
                    });
                  }}
                  placeholder="Rompers & Onesies"
                />
              </Field>

              <Field label="Parent category">
                <Select
                  value={draft.parent ?? ""}
                  onChange={(e) => {
                    const parent = e.target.value || null;
                    const base = draft.slug.split("/").pop() ?? "";
                    setDraft({
                      ...draft,
                      parent,
                      slug: parent ? `${parent}/${base}` : base,
                    });
                  }}
                >
                  <option value="">None — top-level aisle</option>
                  {parents.map((p) => (
                    <option key={p._id} value={p.slug}>{p.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="URL slug" hint={`/category/${draft.slug || "…"}`}>
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                />
              </Field>

              <Field label="Description" hint="Shown on the category page and used as a meta fallback">
                <Textarea
                  value={draft.blurb ?? ""}
                  onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                />
              </Field>

              <Field label="Accent colour">
                <Select
                  value={draft.accent}
                  onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
                >
                  {ACCENTS.map((a) => (
                    <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
                  ))}
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-xs font-bold text-ink">Category image</p>
                <ImageManager
                  images={toMedia(draft.image)}
                  onChange={(next) => setDraft({ ...draft, image: next[0] ?? undefined })}
                  max={1}
                />
              </div>

              <SeoEditor
                value={draft.seoValue}
                onChange={(next) => setDraft({ ...draft, seoValue: next })}
                fallbackTitle={
                  draft.name ? `Kids ${draft.name} Online — ${draft.productCount}+ Styles` : ""
                }
                fallbackDescription={draft.blurb ?? ""}
                urlPath={`/category/${draft.slug || "…"}`}
              />
            </div>

            <footer className="flex gap-2 border-t border-line p-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => onSave(draft)} className="flex-1">
                Save category
              </Button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function IconBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition",
        danger
          ? "text-ink-muted hover:bg-red-50 hover:text-red-600"
          : "text-ink-muted hover:bg-cream hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
