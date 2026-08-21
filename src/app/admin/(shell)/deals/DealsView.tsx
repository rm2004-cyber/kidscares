"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, Flame, Pencil, Plus, Tag, Timer, Trash2, X } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Toggle,
} from "@/components/admin/ui";
import { ImageManager } from "@/components/admin/ImageManager";
import type { Deal } from "@/lib/types";
import { adminApi, ApiError } from "@/utils/service";
import { toMedia, type MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { id: "bg-brand-100", label: "Coral" },
  { id: "bg-mint-100", label: "Mint" },
  { id: "bg-sun-100", label: "Sunshine" },
  { id: "bg-grape-100", label: "Grape" },
  { id: "bg-sky-ks/10", label: "Sky" },
];

type Row = Omit<Deal, "image"> & { image?: MediaItem; active: boolean };

/** Converts an ISO string to the value a datetime-local input expects. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function DealsView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** Applies one end time to every deal — the common "sale ends tonight" case. */
  const [bulkEnd, setBulkEnd] = useState(toLocalInput(new Date().toISOString()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await adminApi.listDeals()) as unknown[];
      const mapped = (list ?? []).map((raw) => {
        const d = raw as Deal & { isActive?: boolean; image?: unknown };
        return { ...d, image: toMedia(d.image)[0], active: d.isActive ?? true };
      });
      setRows(mapped);
      if (mapped[0]) setBulkEnd(toLocalInput(mapped[0].endsAt));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load deals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = async (row: Row) => {
    setError("");
    const payload = {
      title: row.title,
      discountLabel: row.discountLabel,
      href: row.href,
      accent: row.accent,
      endsAt: row.endsAt,
      isActive: row.active,
      ...(row.image ? { image: row.image } : {}),
    };
    try {
      if (/^[a-f\d]{24}$/i.test(row._id)) await adminApi.updateDeal(row._id, payload);
      else await adminApi.createDeal(payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await adminApi.deleteDeal(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  const applyToAll = async () => {
    setError("");
    try {
      await adminApi.setDealsEndsAt(new Date(bulkEnd).toISOString());
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the countdown.");
    }
  };

  const blank = (): Row => ({
    _id: `d${Date.now()}`,
    title: "",
    discountLabel: "",
    href: "/deals",
    image: undefined,
    accent: ACCENTS[0].id,
    endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    active: true,
  });

  return (
    <>
      <PageHeader
        title="Deals & Countdown"
        subtitle="Deal tiles and the timer shown on the storefront."
        actions={
          <Button size="sm" onClick={() => setEditing(blank())}>
            <Plus className="size-4" />
            Add deal
          </Button>
        }
      />

      <Card
        title="Countdown timer"
        description="The clock shown above the deals row on the home page"
        className="mb-4"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            label="Sale ends at"
            hint="Applies to every deal below"
          >
            <Input
              type="datetime-local"
              value={bulkEnd}
              onChange={(e) => setBulkEnd(e.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            onClick={applyToAll}
          >
            <Clock className="size-4" />
            Apply to all
          </Button>
        </div>

        <div className="mt-4 rounded-xl bg-cream p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Storefront preview
          </p>
          <CountdownPreview endsAt={new Date(bulkEnd).toISOString()} />
        </div>
      </Card>

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No deals running"
          copy="Add a deal tile and it shows in the Deals of the Day row."
          action={<Button size="sm" onClick={() => setEditing(blank())}>Add deal</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => (
            <Card key={d._id} bodyClassName="p-3 sm:p-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-xl",
                    d.accent,
                    !d.active && "opacity-40 saturate-0",
                  )}
                >
                  {d.image ? (
                    <Image src={d.image?.url ?? ""} alt="" fill unoptimized sizes="64px" className="object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center"><Tag className="size-6 text-ink-muted" /></span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {d.title || "Untitled deal"}
                  </p>
                  <p className="text-xs font-bold text-brand-600">{d.discountLabel}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                    <Timer className="size-3" />
                    <TimeLeft endsAt={d.endsAt} />
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => setEditing(d)}
                    aria-label="Edit deal"
                    className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-cream hover:text-ink"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => void remove(d._id)}
                    aria-label="Delete deal"
                    className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
                <Badge tone={d.active ? "mint" : "neutral"}>
                  {d.active ? "Live" : "Hidden"}
                </Badge>
                <span className="flex items-center gap-1 truncate text-[11px] text-ink-muted"><ArrowRight className="size-3 shrink-0" />{d.href}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DealSheet row={editing} onClose={() => setEditing(null)} onSave={upsert} />
    </>
  );
}

function DealSheet({
  row,
  onClose,
  onSave,
}: {
  row: Row | null;
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
            role="dialog"
            aria-label="Edit deal"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">Edit deal</h2>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Deal title" required>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Rompers & Onesies"
                />
              </Field>

              <Field label="Offer label" hint="Shown on the tile pill">
                <Input
                  value={draft.discountLabel}
                  onChange={(e) => setDraft({ ...draft, discountLabel: e.target.value })}
                  placeholder="Flat 60% Off"
                />
              </Field>

              <Field label="Links to">
                <Input
                  value={draft.href}
                  onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                  placeholder="/category/clothing"
                />
              </Field>

              <Field label="Ends at">
                <Input
                  type="datetime-local"
                  value={toLocalInput(draft.endsAt)}
                  onChange={(e) =>
                    setDraft({ ...draft, endsAt: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>

              <Field label="Tile colour">
                <Select
                  value={draft.accent}
                  onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
                >
                  {ACCENTS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-xs font-bold text-ink">Tile image</p>
                <ImageManager
                  images={toMedia(draft.image)}
                  onChange={(next) => setDraft({ ...draft, image: next[0] ?? undefined })}
                  max={1}
                />
              </div>

              <div className="rounded-xl border border-line p-3">
                <Toggle
                  checked={draft.active}
                  onChange={(v) => setDraft({ ...draft, active: v })}
                  label="Show on storefront"
                />
              </div>
            </div>

            <footer className="flex gap-2 border-t border-line p-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => onSave(draft)} className="flex-1">
                Save deal
              </Button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* Countdown values are computed on the client only: rendering a remaining
   time on the server produces markup the client contradicts a tick later. */
function useRemaining(endsAt: string) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setMs(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}

function CountdownPreview({ endsAt }: { endsAt: string }) {
  const ms = useRemaining(endsAt);
  const cells =
    ms === null
      ? ["--", "--", "--"]
      : [
          String(Math.floor(ms / 3_600_000)).padStart(2, "0"),
          String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0"),
          String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0"),
        ];

  return (
    <div className="flex items-center gap-1.5">
      <Timer className="size-4 text-brand-600" />
      <span className="text-xs font-semibold text-ink-soft">Ends in</span>
      {cells.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="min-w-8 rounded-lg bg-ink px-1.5 py-1 text-center font-mono text-xs font-bold tabular-nums text-white">
            {c}
          </span>
          {i < 2 && <span className="text-xs font-bold text-ink-muted">:</span>}
        </span>
      ))}
    </div>
  );
}

function TimeLeft({ endsAt }: { endsAt: string }) {
  const ms = useRemaining(endsAt);
  if (ms === null) return <span>—</span>;
  if (ms === 0) return <span className="font-semibold text-red-600">Expired</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return <span>{h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`}</span>;
}
