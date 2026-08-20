"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "./ui";
import { ImageManager } from "./ImageManager";
import { SeoEditor, type SeoValue } from "./SeoEditor";
import { discountPct, inr } from "@/lib/data";
import {
  slugify,
  type ProductFormValue,
} from "@/lib/admin/productForm";

export function ProductForm({
  initial,
  mode,
  brands,
  categories,
  ageGroups,
}: {
  initial: ProductFormValue;
  mode: "create" | "edit";
  brands: string[];
  categories: { slug: string; name: string }[];
  ageGroups: { slug: string; label: string }[];
}) {
  const [v, setV] = useState<ProductFormValue>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const off = useMemo(
    () => (v.mrp > 0 && v.price > 0 ? discountPct(v.mrp, v.price) : 0),
    [v.mrp, v.price],
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = "Title is required";
    if (!v.slug.trim()) e.slug = "Slug is required";
    if (!v.brand) e.brand = "Pick a brand";
    if (!v.categorySlug) e.categorySlug = "Pick a category";
    if (v.price <= 0) e.price = "Price must be greater than 0";
    if (v.mrp < v.price) e.mrp = "MRP cannot be lower than the selling price";
    if (v.images.length === 0) e.images = "Add at least one image";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector("[data-error]")?.scrollIntoView({ block: "center" });
      return;
    }
    // Persistence lands with the backend phase; the payload is already final.
    console.log("product payload", v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={mode === "create" ? "Add product" : v.title || "Edit product"}
        subtitle={
          mode === "create"
            ? "Create a new catalogue entry."
            : `Editing /product/${v.slug}`
        }
        actions={
          <>
            <Link href="/admin/products">
              <Button variant="ghost" size="sm" type="button">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </Link>
            {mode === "edit" && (
              <Link href={`/product/${v.slug}`} target="_blank">
                <Button variant="secondary" size="sm" type="button">
                  <Eye className="size-4" />
                  Preview
                </Button>
              </Link>
            )}
            <Button size="sm" type="submit">
              <Save className="size-4" />
              {saved ? "Saved" : "Save product"}
            </Button>
          </>
        }
      />

      {saved && (
        <div className="mb-4 rounded-xl border border-mint-200 bg-mint-50 px-4 py-2.5 text-sm font-semibold text-mint-700">
          Payload validated and logged to the console — wiring to MongoDB is the
          next phase.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card title="Basics">
            <div className="space-y-4">
              <Field label="Product title" required error={errors.title}>
                <Input
                  value={v.title}
                  data-error={errors.title ? "" : undefined}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                  placeholder="Organic Cotton Full-Sleeve Romper"
                />
              </Field>

              <Field
                label="URL slug"
                required
                error={errors.slug}
                hint={`kidscare.example/product/${v.slug || "…"}`}
              >
                <Input
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                  placeholder="organic-cotton-romper"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand" required error={errors.brand}>
                  <Select
                    value={v.brand}
                    onChange={(e) => set("brand", e.target.value)}
                  >
                    <option value="">Select a brand</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Category" required error={errors.categorySlug}>
                  <Select
                    value={v.categorySlug}
                    onChange={(e) => set("categorySlug", e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Description">
                <Textarea
                  value={v.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What it is, what it is made of, and why a parent would pick it."
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Images"
            description="First image is the main one shown on cards"
          >
            {errors.images && (
              <p className="mb-2 text-[11px] font-semibold text-red-600" data-error="">
                {errors.images}
              </p>
            )}
            <ImageManager images={v.images} onChange={(next) => set("images", next)} />
          </Card>

          <Card title="Pricing & stock">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Selling price (₹)" required error={errors.price}>
                <Input
                  type="number"
                  min={0}
                  value={v.price || ""}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
              </Field>
              <Field label="MRP (₹)" required error={errors.mrp}>
                <Input
                  type="number"
                  min={0}
                  value={v.mrp || ""}
                  onChange={(e) => set("mrp", Number(e.target.value))}
                />
              </Field>
              <Field label="Discount" hint="Calculated">
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-line bg-cream px-3">
                  <span className="font-display text-lg font-extrabold text-mint-600">
                    {off}%
                  </span>
                  {v.mrp > v.price && (
                    <span className="text-[11px] text-ink-muted">
                      saves {inr(v.mrp - v.price)}
                    </span>
                  )}
                </div>
              </Field>
            </div>

            <div className="mt-3 rounded-xl border border-line p-3">
              <Toggle
                checked={v.inStock}
                onChange={(val) => set("inStock", val)}
                label="In stock"
                hint="Off shows an 'Out of stock' overlay and disables Add to Bag."
              />
            </div>
          </Card>

          <Card title="Variants">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold text-ink">Sizes</p>
                <TokenInput
                  values={v.sizes}
                  onChange={(next) => set("sizes", next)}
                  placeholder="0-3M, 3-6M, 1-2Y…"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-ink">Colours</p>
                <ColorEditor
                  colors={v.colors}
                  onChange={(next) => set("colors", next)}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-ink">Age groups</p>
                <div className="flex flex-wrap gap-1.5">
                  {ageGroups.map((a) => {
                    const on = v.ageSlugs.includes(a.slug);
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set(
                            "ageSlugs",
                            on
                              ? v.ageSlugs.filter((s) => s !== a.slug)
                              : [...v.ageSlugs, a.slug],
                          )
                        }
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          on
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-line bg-white text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Highlights">
            <TokenInput
              values={v.highlights}
              onChange={(next) => set("highlights", next)}
              placeholder="Machine washable, OEKO-TEX certified…"
              block
            />
          </Card>

          <Card
            title="Safety & compliance"
            description="Shown prominently on the product page and used in structured data"
          >
            <div className="space-y-4">
              <Field label="Certification">
                <Input
                  value={v.safety.certification}
                  onChange={(e) =>
                    set("safety", { ...v.safety, certification: e.target.value })
                  }
                  placeholder="BIS / ISO 8124 toy-safety tested"
                />
              </Field>
              <Field label="Age warning">
                <Input
                  value={v.safety.ageWarning}
                  onChange={(e) =>
                    set("safety", { ...v.safety, ageWarning: e.target.value })
                  }
                  placeholder="Not suitable for children under 3 — contains small parts."
                />
              </Field>
              <Field label="Materials">
                <Input
                  value={v.safety.material}
                  onChange={(e) =>
                    set("safety", { ...v.safety, material: e.target.value })
                  }
                  placeholder="OEKO-TEX certified cotton"
                />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="Visibility">
            <Field label="Badge" hint="Corner ribbon on the card">
              <Select
                value={v.badge}
                onChange={(e) => set("badge", e.target.value as ProductFormValue["badge"])}
              >
                <option value="">No badge</option>
                <option value="new">New</option>
                <option value="bestseller">Bestseller</option>
                <option value="sale">Sale</option>
                <option value="limited">Limited</option>
              </Select>
            </Field>

            <div className="mt-4 rounded-xl bg-cream p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                Card preview
              </p>
              <div className="rounded-xl border border-line bg-white p-2.5">
                <div className="mb-2 aspect-[4/5] overflow-hidden rounded-lg bg-cream">
                  {v.images[0] ? (
                    // Blob URLs from the local uploader cannot go through
                    // next/image, so the preview uses a plain img.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.images[0]}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center"><ImageIcon className="size-7 text-ink-muted" /></div>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase text-brand-600">
                  {v.brand || "Brand"}
                </p>
                <p className="line-clamp-2 text-xs font-semibold">
                  {v.title || "Product title"}
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold">{inr(v.price || 0)}</span>
                  {v.mrp > v.price && (
                    <>
                      <span className="text-[10px] text-ink-muted line-through">
                        {inr(v.mrp)}
                      </span>
                      <span className="text-[10px] font-bold text-mint-600">
                        {off}% off
                      </span>
                    </>
                  )}
                </div>
                {v.badge && (
                  <Badge tone="brand" className="mt-1.5">
                    {v.badge}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          <SeoEditor
            value={v.seo}
            onChange={(next) => set("seo", next)}
            fallbackTitle={
              v.title ? `${v.title} by ${v.brand || "Brand"} — ${off}% Off` : ""
            }
            fallbackDescription={v.description}
            urlPath={`/product/${v.slug || "…"}`}
          />

          {mode === "edit" && (
            <Card title="Danger zone">
              <p className="mb-3 text-xs text-ink-soft">
                Deleting removes the product and its URL. Any inbound links will
                start returning 404 unless you add a redirect.
              </p>
              <Button variant="danger" size="sm" type="button" className="w-full">
                <Trash2 className="size-3.5" />
                Delete product
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- helpers */

function TokenInput({
  values,
  onChange,
  placeholder,
  block,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Render each token on its own row — better for long sentences. */
  block?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().replace(/,$/, "");
    if (t && !values.includes(t)) onChange([...values, t]);
    setDraft("");
  };

  return (
    <div>
      {block ? (
        <ul className="mb-2 space-y-1.5">
          {values.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-xs"
            >
              <Check className="size-3.5 shrink-0 text-mint-500" strokeWidth={3} />
              <span className="flex-1">{t}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-ink-muted hover:text-brand-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-lg bg-cream px-2 py-1 text-[11px] font-semibold"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-ink-muted hover:text-brand-600"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button variant="secondary" type="button" onClick={add} className="shrink-0">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ColorEditor({
  colors,
  onChange,
}: {
  colors: { name: string; hex: string }[];
  onChange: (next: { name: string; hex: string }[]) => void;
}) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#f74d3f");

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <li
            key={c.name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold"
          >
            <span
              className="size-3.5 rounded-full ring-1 ring-line"
              style={{ backgroundColor: c.hex }}
            />
            {c.name}
            <button
              type="button"
              onClick={() => onChange(colors.filter((x) => x.name !== c.name))}
              aria-label={`Remove ${c.name}`}
              className="text-ink-muted hover:text-brand-600"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          aria-label="Colour swatch"
          className="h-[42px] w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Colour name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (name.trim()) {
                onChange([...colors, { name: name.trim(), hex }]);
                setName("");
              }
            }
          }}
        />
        <Button
          variant="secondary"
          type="button"
          className="shrink-0"
          onClick={() => {
            if (name.trim()) {
              onChange([...colors, { name: name.trim(), hex }]);
              setName("");
            }
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
