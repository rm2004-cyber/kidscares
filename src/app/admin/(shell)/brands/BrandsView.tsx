"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus, Tag, Trash2, X } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/admin/ui";
import { ImageManager } from "@/components/admin/ImageManager";
import type { Brand, Product } from "@/lib/types";

type Row = Brand & { description?: string };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function BrandsView({
  brands,
  products,
}: {
  brands: Brand[];
  products: Product[];
}) {
  const [rows, setRows] = useState<Row[]>(brands);
  const [editing, setEditing] = useState<Row | null>(null);

  const countFor = (name: string) =>
    products.filter((p) => p.brand === name).length;

  const blank = (): Row => ({
    _id: `b${Date.now()}`,
    slug: "",
    name: "",
    logo: "",
    description: "",
  });

  return (
    <>
      <PageHeader
        title="Brands"
        subtitle={`${rows.length} brands in the catalogue`}
        actions={
          <Button size="sm" onClick={() => setEditing(blank())}>
            <Plus className="size-4" />
            Add brand
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((b) => (
          <Card key={b._id} bodyClassName="p-3 sm:p-3">
            <div className="flex items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                {b.logo ? (
                  <Image src={b.logo} alt="" fill unoptimized sizes="56px" className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center"><Tag className="size-5 text-ink-muted" /></span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{b.name}</p>
                <p className="truncate text-[11px] text-ink-muted">/{b.slug}</p>
                <Badge tone="neutral" className="mt-1">
                  {countFor(b.name)} products
                </Badge>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => setEditing(b)}
                  aria-label={`Edit ${b.name}`}
                  className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-cream hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setRows((prev) => prev.filter((r) => r._id !== b._id))}
                  aria-label={`Delete ${b.name}`}
                  className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
              className="fixed inset-0 z-50 bg-ink/40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
              role="dialog"
              aria-label="Edit brand"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="font-display text-base font-extrabold">
                  {editing.name || "New brand"}
                </h2>
                <button onClick={() => setEditing(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <Field label="Brand name" required>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        name: e.target.value,
                        slug: slugify(e.target.value),
                      })
                    }
                    placeholder="TinyTwig"
                  />
                </Field>

                <Field label="Slug" hint={`/search?q=${editing.slug || "…"}`}>
                  <Input
                    value={editing.slug}
                    onChange={(e) =>
                      setEditing({ ...editing, slug: slugify(e.target.value) })
                    }
                  />
                </Field>

                <Field label="About this brand">
                  <Textarea
                    value={editing.description ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    placeholder="What they make and what parents should know."
                  />
                </Field>

                <div>
                  <p className="mb-2 text-xs font-bold text-ink">Logo</p>
                  <ImageManager
                    images={editing.logo ? [editing.logo] : []}
                    onChange={(next) => setEditing({ ...editing, logo: next[0] ?? "" })}
                    max={1}
                  />
                </div>
              </div>

              <footer className="flex gap-2 border-t border-line p-4">
                <Button variant="secondary" onClick={() => setEditing(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setRows((prev) =>
                      prev.some((r) => r._id === editing._id)
                        ? prev.map((r) => (r._id === editing._id ? editing : r))
                        : [...prev, editing],
                    );
                    setEditing(null);
                  }}
                  className="flex-1"
                >
                  Save brand
                </Button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
