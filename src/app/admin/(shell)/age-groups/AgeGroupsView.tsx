"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Baby,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
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
  Toggle,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { cn } from "@/lib/utils";

type AgeGroup = {
  _id: string;
  slug: string;
  label: string;
  minMonths: number;
  maxMonths: number;
  order?: number;
  isActive?: boolean;
  image?: { url?: string; publicId?: string };
};

type Draft = {
  label: string;
  minMonths: string;
  maxMonths: string;
  order: string;
  isActive: boolean;
  image?: { url?: string; publicId?: string };
};

const blank: Draft = {
  label: "",
  minMonths: "0",
  maxMonths: "12",
  order: "0",
  isActive: true,
};

/**
 * Age groups.
 *
 * The photo is the point of this screen — the storefront's age tiles lead with
 * it, and a group without one falls back to a glyph that says far less to a
 * parent scanning for their child's size.
 */
export function AgeGroupsView() {
  const [rows, setRows] = useState<AgeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AgeGroup | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(((await adminApi.listAgeGroups()) ?? []) as AgeGroup[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load age groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (g: AgeGroup) => {
    setError("");
    try {
      await adminApi.deleteAgeGroup(g._id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that group.");
    }
  };

  return (
    <>
      <PageHeader
        title="Age groups"
        subtitle="The age tiles on the home page. The photo is what shoppers actually read."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New group
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
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="No age groups yet"
          copy="Add the bands you sell by — 0–6 months, 2–4 years, and so on."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {rows.map((g) => (
            <li key={g._id}>
              <Card bodyClassName="p-0 sm:p-0">
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl bg-cream">
                  {g.image?.url ? (
                    <Image
                      src={g.image.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="200px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-ink-muted">
                      <Baby className="size-8" />
                    </span>
                  )}
                  {!g.isActive && (
                    <span className="absolute left-2 top-2">
                      <Badge tone="neutral">Hidden</Badge>
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="truncate text-xs font-bold text-ink">{g.label}</p>
                  <p className="text-[11px] text-ink-muted">
                    {g.minMonths}–{g.maxMonths} months
                  </p>

                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setEditing(g)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void remove(g)}
                      aria-label={`Delete ${g.label}`}
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

function EditDrawer({
  target,
  onClose,
  onSaved,
}: {
  target: AgeGroup | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /* Reset during render rather than in an effect, so reopening never shows the
     previous group's values for a frame. */
  const [seen, setSeen] = useState<typeof target>(null);
  if (target !== seen) {
    setSeen(target);
    setError("");
    if (target === "new") setDraft(blank);
    else if (target) {
      setDraft({
        label: target.label,
        minMonths: String(target.minMonths),
        maxMonths: String(target.maxMonths),
        order: String(target.order ?? 0),
        isActive: target.isActive ?? true,
        image: target.image,
      });
    }
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const [img] = (await adminApi.uploadImages([file])) as {
        url: string;
        publicId: string;
      }[];
      set("image", img);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Upload failed. Check the Cloudinary keys in the server .env.",
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const min = Number(draft.minMonths);
    const max = Number(draft.maxMonths);
    if (!draft.label.trim()) return setError("Give the group a label.");
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return setError("The upper bound has to be above the lower one.");
    }

    setBusy(true);
    setError("");
    try {
      const body = {
        label: draft.label.trim(),
        minMonths: min,
        maxMonths: max,
        order: Number(draft.order) || 0,
        isActive: draft.isActive,
        image: draft.image,
      };
      if (target === "new") await adminApi.createAgeGroup(body);
      else if (target) await adminApi.updateAgeGroup(target._id, body);
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
            aria-label="Age group"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">
                {target === "new" ? "New age group" : draft.label || "Age group"}
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

              <div>
                <p className="mb-1.5 text-xs font-bold text-ink">Photo</p>
                <div className="flex items-start gap-3">
                  <span className="relative size-28 shrink-0 overflow-hidden rounded-xl rounded-t-[999px] bg-cream">
                    {draft.image?.url ? (
                      <Image
                        src={draft.image.url}
                        alt=""
                        fill
                        unoptimized
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-ink-muted">
                        <Baby className="size-7" />
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-3 py-3 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600",
                        uploading && "pointer-events-none opacity-60",
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploading ? "Uploading…" : "Choose image"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          void upload(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                      A child of this age, shot upright. The tile crops to a tall
                      arch, so keep the face in the upper half.
                    </p>
                    {draft.image?.url && (
                      <button
                        type="button"
                        onClick={() => set("image", undefined)}
                        className="mt-1 text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Field label="Label" hint="Shown under the photo">
                <Input
                  value={draft.label}
                  onChange={(e) => set("label", e.target.value)}
                  placeholder="0–6 Months"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="From (months)">
                  <Input
                    value={draft.minMonths}
                    inputMode="numeric"
                    onChange={(e) => set("minMonths", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field label="To (months)">
                  <Input
                    value={draft.maxMonths}
                    inputMode="numeric"
                    onChange={(e) => set("maxMonths", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              </div>

              <Field label="Order" hint="Lower numbers come first">
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
                  label="Show on the storefront"
                  hint="Turn off to hide the tile without deleting the group."
                />
              </div>
            </div>

            <footer className="border-t border-line p-4">
              <Button className="w-full" onClick={save} disabled={busy || uploading}>
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
