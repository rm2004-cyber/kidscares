"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ArrowRight,
  Image as ImageIcon,
  Pencil,
  Plus,
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
import { ImageManager } from "@/components/admin/ImageManager";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Presets keep admins away from raw Tailwind classes. */
const GRADIENTS = [
  { id: "from-brand-400 via-brand-500 to-grape-500", label: "Coral → Grape" },
  { id: "from-mint-400 via-mint-500 to-sky-ks", label: "Mint → Sky" },
  { id: "from-sun-400 via-sun-500 to-brand-400", label: "Sunshine → Coral" },
  { id: "from-grape-500 via-grape-600 to-sky-ks", label: "Grape → Sky" },
  { id: "from-sky-ks via-sky-ks to-mint-500", label: "Sky → Mint" },
  { id: "from-ink via-ink to-grape-600", label: "Ink → Grape" },
];

type Row = Banner & { active: boolean };

export function BannersView({ banners }: { banners: Banner[] }) {
  const [rows, setRows] = useState<Row[]>(
    banners.map((b) => ({ ...b, active: true })),
  );
  const [editing, setEditing] = useState<Row | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const upsert = (row: Row) => {
    setRows((prev) =>
      prev.some((r) => r._id === row._id)
        ? prev.map((r) => (r._id === row._id ? row : r))
        : [...prev, row],
    );
    setEditing(null);
  };

  const blank = (): Row => ({
    _id: `bn${Date.now()}`,
    title: "",
    subtitle: "",
    cta: "Shop now",
    href: "/deals",
    image: "",
    gradient: GRADIENTS[0].id,
    align: "left",
    active: true,
  });

  return (
    <>
      <PageHeader
        title="Advertisements"
        subtitle="Hero banners on the storefront. Order here is the order shoppers see."
        actions={
          <Button size="sm" onClick={() => setEditing(blank())}>
            <Plus className="size-4" />
            Add banner
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No banners yet"
          copy="Add one and it appears in the storefront hero carousel."
          action={
            <Button size="sm" onClick={() => setEditing(blank())}>
              Add banner
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b, i) => (
            <Card key={b._id} bodyClassName="p-0 sm:p-0">
              <div className="flex flex-col gap-0 sm:flex-row">
                {/* Live preview of exactly what renders on the storefront. */}
                <div
                  className={cn(
                    "relative flex min-h-32 flex-1 items-center overflow-hidden bg-gradient-to-br p-5",
                    b.gradient,
                    !b.active && "opacity-40 saturate-0",
                  )}
                >
                  <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-white/10" />
                  <div
                    className={cn(
                      "relative z-10 text-white",
                      b.align === "right" && "ml-auto text-right",
                    )}
                  >
                    <p className="font-display text-lg font-extrabold leading-tight">
                      {b.title || "Untitled banner"}
                    </p>
                    <p className="mt-0.5 max-w-sm text-xs text-white/85">
                      {b.subtitle}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink">
                      {b.cta}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-line p-3 sm:w-56 sm:flex-col sm:items-stretch sm:border-l sm:border-t-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={b.active ? "mint" : "neutral"}>
                        {b.active ? "Live" : "Hidden"}
                      </Badge>
                      <Badge tone="neutral">#{i + 1}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-ink-muted">
                      <ArrowRight className="inline size-3" /> {b.href}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label={b.active ? "Hide" : "Show"}
                      onClick={() =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r._id === b._id ? { ...r, active: !r.active } : r,
                          ),
                        )
                      }
                    >
                      {b.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </IconBtn>
                    <IconBtn label="Edit" onClick={() => setEditing(b)}>
                      <Pencil className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label="Delete"
                      danger
                      onClick={() => setRows((prev) => prev.filter((r) => r._id !== b._id))}
                    >
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BannerSheet
        row={editing}
        onClose={() => setEditing(null)}
        onSave={upsert}
      />
    </>
  );
}

function BannerSheet({
  row,
  onClose,
  onSave,
}: {
  row: Row | null;
  onClose: () => void;
  onSave: (r: Row) => void;
}) {
  const [draft, setDraft] = useState<Row | null>(row);

  // Re-seed the draft whenever a different banner is opened.
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
            aria-label="Edit banner"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">Edit banner</h2>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div
                className={cn(
                  "relative flex min-h-28 items-center overflow-hidden rounded-xl bg-gradient-to-br p-4",
                  draft.gradient,
                )}
              >
                <div className="text-white">
                  <p className="font-display text-base font-extrabold">
                    {draft.title || "Untitled banner"}
                  </p>
                  <p className="text-[11px] text-white/85">{draft.subtitle}</p>
                </div>
              </div>

              <Field label="Headline" required>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="The Big Kids Carnival"
                />
              </Field>

              <Field label="Subtitle">
                <Textarea
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  placeholder="Up to 70% off across clothing, toys and footwear."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button text">
                  <Input
                    value={draft.cta}
                    onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
                  />
                </Field>
                <Field label="Links to" hint="Storefront path">
                  <Input
                    value={draft.href}
                    onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                    placeholder="/category/toys"
                  />
                </Field>
              </div>

              <Field label="Background">
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, gradient: g.id })}
                      aria-pressed={draft.gradient === g.id}
                      className={cn(
                        "h-12 rounded-lg bg-gradient-to-br ring-2 transition",
                        g.id,
                        draft.gradient === g.id ? "ring-ink" : "ring-transparent",
                      )}
                      title={g.label}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Content alignment">
                <Select
                  value={draft.align}
                  onChange={(e) =>
                    setDraft({ ...draft, align: e.target.value as Banner["align"] })
                  }
                >
                  <option value="left">Text left, image right</option>
                  <option value="right">Text right, image left</option>
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-xs font-bold text-ink">Banner image</p>
                <ImageManager
                  images={draft.image ? [draft.image] : []}
                  onChange={(next) => setDraft({ ...draft, image: next[0] ?? "" })}
                  max={1}
                />
              </div>

              <div className="rounded-xl border border-line p-3">
                <Toggle
                  checked={draft.active}
                  onChange={(v) => setDraft({ ...draft, active: v })}
                  label="Show on storefront"
                  hint="Hidden banners stay saved but do not appear in the carousel."
                />
              </div>
            </div>

            <footer className="flex gap-2 border-t border-line p-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => onSave(draft)} className="flex-1">
                Save banner
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
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition disabled:opacity-30",
        danger
          ? "text-ink-muted hover:bg-red-50 hover:text-red-600"
          : "text-ink-muted hover:bg-cream hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
