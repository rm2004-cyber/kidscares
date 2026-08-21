"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Check, Home, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Form";
import { useAddresses } from "@/store/useAddresses";
import type { Address } from "@/lib/account/types";
import {
  AddressFormSheet,
  emptyAddress,
  type AddressDraft,
} from "./AddressForm";
import { cn } from "@/lib/utils";

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPin };

export function AddressesView() {
  const { addresses, add, update, remove, setDefault, load, loaded, loading } =
    useAddresses();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const hydrated = loaded && !loading;

  const [sheet, setSheet] = useState<{
    open: boolean;
    id: string | null;
    initial: AddressDraft;
  }>({ open: false, id: null, initial: emptyAddress });

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () =>
    setSheet({ open: true, id: null, initial: { ...emptyAddress } });

  const openEdit = (a: Address) => {
    const { _id, ...draft } = a;
    void _id;
    setSheet({ open: true, id: a._id, initial: draft });
  };

  const save = async (v: AddressDraft) => {
    if (sheet.id) await update(sheet.id, v);
    else await add(v);
    setSheet((s) => ({ ...s, open: false }));
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Addresses</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {hydrated
              ? `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`
              : "Loading your address book…"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          Add new
        </Button>
      </div>

      {!hydrated ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-44 rounded-card" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-white py-16 text-center">
          <MapPin className="size-12 text-ink-muted" />
          <p className="font-display text-lg font-bold">No addresses yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Add one now and checkout will be a single tap.
          </p>
          <Button size="sm" onClick={openNew} className="mt-1">
            <Plus className="size-4" />
            Add an address
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {addresses.map((a) => {
              const Icon = LABEL_ICON[a.label];
              return (
                <motion.li
                  key={a._id}
                  layout
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={cn(
                    "flex flex-col rounded-card border-2 bg-white p-4",
                    a.isDefault ? "border-brand-300" : "border-line",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-cream text-ink-soft">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-extrabold text-ink">{a.label}</span>
                    {a.isDefault && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold text-brand-700">
                        <Check className="size-3" strokeWidth={3} />
                        Default
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-ink">{a.fullName}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    {a.landmark ? `, near ${a.landmark}` : ""}
                    <br />
                    {a.city}, {a.state} — {a.pincode}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">{a.phone}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {!a.isDefault && (
                      <button
                        onClick={() => void setDefault(a._id)}
                        className="rounded-full border-2 border-line px-3 py-1.5 text-[11px] font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(a)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-ink-soft transition hover:bg-cream hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmId(a._id)}
                      className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-ink-muted transition hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <AddressFormSheet
        open={sheet.open}
        initial={sheet.initial}
        title={sheet.id ? "Edit address" : "Add a new address"}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={save}
      />

      {/* Deleting an address is irreversible, so it asks first. */}
      <AnimatePresence>
        {confirmId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmId(null)}
              className="fixed inset-0 z-[70] bg-ink/45"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="dialog"
              aria-label="Confirm delete"
              className="fixed left-1/2 top-1/2 z-[70] w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card bg-white p-6 text-center"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50">
                <Trash2 className="size-5 text-brand-600" />
              </span>
              <p className="mt-3 font-display text-lg font-extrabold">
                Delete this address?
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                You can always add it again later.
              </p>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmId(null)}
                >
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    void remove(confirmId);
                    setConfirmId(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
