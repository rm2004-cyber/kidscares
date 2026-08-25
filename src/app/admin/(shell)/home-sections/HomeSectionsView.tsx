"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  GripVertical,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { cn } from "@/lib/utils";

type Source = "manual" | "category" | "badge" | "newest";

type Section = {
  _id: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  icon?: string;
  iconClassName?: string;
  source: Source;
  categorySlug?: string;
  badge?: string;
  sortBy?: string;
  limit?: number;
  order?: number;
  isActive?: boolean;
  productCount?: number;
};

const SOURCE_LABEL: Record<Source, string> = {
  manual: "Hand-picked",
  category: "From a category",
  badge: "By badge",
  newest: "Newest products",
};

const SOURCE_HINT: Record<Source, string> = {
  manual: "You choose the products, on each product's own page.",
  category: "Everything in the chosen aisle, including its sub-categories.",
  badge: "Every product carrying the chosen badge.",
  newest: "The most recently added products, updated on its own.",
};

const ICONS = ["Star", "Sparkles", "ToyBrick", "Baby", "Shirt", "ShoppingBag", "Tag", "Umbrella"];

/**
 * Home page rows.
 *
 * These used to be hard-coded in the storefront, so renaming a row or pointing
 * it at a different aisle meant a deploy. The list here is the page order, top
 * to bottom.
 */
export function HomeSectionsView() {
  const [rows, setRows] = useState<Section[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Section | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, cats] = await Promise.all([
        adminApi.listHomeSections(),
        adminApi.listCategories().catch(() => []),
      ]);
      setRows((list ?? []) as Section[]);
      setCategories(
        ((cats ?? []) as { slug: string; name: string }[]).map((c) => ({
          slug: c.slug,
          name: c.name,
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (s: Section) => {
    setError("");
    try {
      await adminApi.deleteHomeSection(s._id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that section.");
    }
  };

  return (
    <>
      <PageHeader
        title="Home sections"
        subtitle="The product rows on the home page, in the order they appear."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New section
            </Button>
          </div>
        }
      />

      {error && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="No sections yet"
          copy="Add a row and the home page will start showing it."
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((s) => (
            <li key={s._id}>
              <Card bodyClassName="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-ink-muted">
                    <GripVertical className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-ink">{s.title}</p>
                      <Badge tone="sky">{SOURCE_LABEL[s.source]}</Badge>
                      {!s.isActive && <Badge tone="neutral">Hidden</Badge>}
                      {s.productCount === 0 && (
                        <Badge tone="red">Empty — will not show</Badge>
                      )}
                    </div>

                    {s.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-ink-soft">{s.subtitle}</p>
                    )}

                    <p className="mt-1 text-[11px] text-ink-muted">
                      Position {s.order ?? 0} · {s.productCount ?? 0} product
                      {s.productCount === 1 ? "" : "s"}
                      {s.source === "category" && s.categorySlug ? ` · ${s.categorySlug}` : ""}
                      {s.source === "badge" && s.badge ? ` · ${s.badge}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void remove(s)}
                      aria-label={`Delete ${s.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <EditDrawer
        target={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </>
  );
}

/* ──────────────────────────── edit drawer ─────────────────────────────── */

type Draft = {
  title: string;
  subtitle: string;
  viewAllHref: string;
  icon: string;
  source: Source;
  categorySlug: string;
  badge: string;
  sortBy: string;
  limit: string;
  order: string;
  isActive: boolean;
};

const blank: Draft = {
  title: "",
  subtitle: "",
  viewAllHref: "",
  icon: "Sparkles",
  source: "manual",
  categorySlug: "",
  badge: "",
  sortBy: "popular",
  limit: "10",
  order: "0",
  isActive: true,
};

function EditDrawer({
  target,
  categories,
  onClose,
  onSaved,
}: {
  target: Section | "new" | null;
  categories: { slug: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [seen, setSeen] = useState<typeof target>(null);
  if (target !== seen) {
    setSeen(target);
    setError("");
    if (target === "new") setDraft(blank);
    else if (target) {
      setDraft({
        title: target.title,
        subtitle: target.subtitle ?? "",
        viewAllHref: target.viewAllHref ?? "",
        icon: target.icon || "Sparkles",
        source: target.source,
        categorySlug: target.categorySlug ?? "",
        badge: target.badge ?? "",
        sortBy: target.sortBy ?? "popular",
        limit: String(target.limit ?? 10),
        order: String(target.order ?? 0),
        isActive: target.isActive ?? true,
      });
    }
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.title.trim()) return setError("Give the section a title.");
    if (draft.source === "category" && !draft.categorySlug) {
      return setError("Choose which category this row pulls from.");
    }
    if (draft.source === "badge" && !draft.badge) {
      return setError("Choose which badge this row pulls.");
    }

    setBusy(true);
    setError("");
    try {
      const body = {
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        viewAllHref: draft.viewAllHref.trim(),
        icon: draft.icon,
        source: draft.source,
        categorySlug: draft.source === "category" ? draft.categorySlug : "",
        badge: draft.source === "badge" ? draft.badge : "",
        sortBy: draft.sortBy,
        limit: Number(draft.limit) || 10,
        order: Number(draft.order) || 0,
        isActive: draft.isActive,
      };
      if (target === "new") await adminApi.createHomeSection(body);
      else if (target) await adminApi.updateHomeSection(target._id, body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {target && (
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
            role="dialog"
            aria-label="Home section"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">
                {target === "new" ? "New section" : draft.title || "Section"}
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {error && (
                <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
                  <AlertCircle className="mt-px size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Field label="Title">
                <Input
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Parent Favourites"
                />
              </Field>

              <Field label="Subtitle" hint="Optional">
                <Textarea
                  value={draft.subtitle}
                  onChange={(e) => set("subtitle", e.target.value.slice(0, 160))}
                  placeholder="The products reordered most this month."
                  rows={2}
                />
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-bold text-ink">Where products come from</p>
                <div className="grid gap-1.5">
                  {(Object.keys(SOURCE_LABEL) as Source[]).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => set("source", src)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-left transition",
                        draft.source === src
                          ? "border-brand-500 bg-brand-50"
                          : "border-line hover:border-brand-300",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-xs font-bold",
                          draft.source === src ? "text-brand-700" : "text-ink",
                        )}
                      >
                        {SOURCE_LABEL[src]}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {SOURCE_HINT[src]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {draft.source === "category" && (
                <Field label="Category">
                  <Select
                    value={draft.categorySlug}
                    onChange={(e) => set("categorySlug", e.target.value)}
                  >
                    <option value="">Choose a category…</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {draft.source === "badge" && (
                <Field label="Badge">
                  <Select value={draft.badge} onChange={(e) => set("badge", e.target.value)}>
                    <option value="">Choose a badge…</option>
                    <option value="bestseller">Bestseller</option>
                    <option value="new">New</option>
                    <option value="sale">Sale</option>
                    <option value="limited">Limited</option>
                  </Select>
                </Field>
              )}

              {draft.source === "manual" && (
                <p className="rounded-xl bg-cream px-3 py-2.5 text-[11px] leading-relaxed text-ink-soft">
                  Save this section first, then open any product and tick this
                  section under <b className="text-ink">Home sections</b>. A product
                  can sit in several rows at once.
                </p>
              )}

              <Field label="View all link" hint="Where the arrow goes. Leave blank to hide it.">
                <Input
                  value={draft.viewAllHref}
                  onChange={(e) => set("viewAllHref", e.target.value)}
                  placeholder="/category/toys"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Icon">
                  <Select value={draft.icon} onChange={(e) => set("icon", e.target.value)}>
                    {ICONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Max products">
                  <Input
                    value={draft.limit}
                    inputMode="numeric"
                    onChange={(e) => set("limit", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              </div>

              {draft.source !== "manual" && (
                <Field label="Sort by">
                  <Select value={draft.sortBy} onChange={(e) => set("sortBy", e.target.value)}>
                    <option value="popular">Most reviewed</option>
                    <option value="new">Newest first</option>
                    <option value="rating">Highest rated</option>
                    <option value="price-asc">Price, low to high</option>
                    <option value="price-desc">Price, high to low</option>
                  </Select>
                </Field>
              )}

              <Field label="Position" hint="Lower numbers appear higher on the page">
                <Input
                  value={draft.order}
                  inputMode="numeric"
                  onChange={(e) => set("order", e.target.value.replace(/\D/g, ""))}
                />
              </Field>

              <div className="rounded-xl border border-line p-3">
                <Toggle
                  checked={draft.isActive}
                  onChange={(v) => set("isActive", v)}
                  label="Show on the home page"
                  hint="A row with no products is hidden automatically either way."
                />
              </div>
            </div>

            <footer className="border-t border-line p-4">
              <Button className="w-full" onClick={save} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Save
                  </>
                )}
              </Button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
