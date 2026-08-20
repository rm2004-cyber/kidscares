"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Home, MapPin, X } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
} from "@/components/ui/Form";
import type { Address } from "@/lib/account/types";
import { INDIAN_STATES } from "@/lib/account/mock";
import { cn } from "@/lib/utils";

export type AddressDraft = Omit<Address, "_id">;

export const emptyAddress: AddressDraft = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "Punjab",
  pincode: "",
  isDefault: false,
};

const LABELS = [
  { id: "Home", icon: Home },
  { id: "Work", icon: Briefcase },
  { id: "Other", icon: MapPin },
] as const;

/** Validation mirrors what the API will enforce, so errors are consistent. */
export function validateAddress(v: AddressDraft) {
  const e: Partial<Record<keyof AddressDraft, string>> = {};
  if (!v.fullName.trim()) e.fullName = "Enter the recipient's name";
  if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.phone.replace(/\s|-/g, "")))
    e.phone = "Enter a valid 10-digit mobile number";
  if (!v.line1.trim()) e.line1 = "Enter the flat, house or building";
  if (!v.city.trim()) e.city = "Enter the city";
  if (!/^\d{6}$/.test(v.pincode)) e.pincode = "PIN code must be 6 digits";
  return e;
}

export function AddressFormSheet({
  open,
  initial,
  title,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: AddressDraft;
  title: string;
  onClose: () => void;
  onSave: (v: AddressDraft) => void;
}) {
  const [v, setV] = useState<AddressDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});
  const [seeded, setSeeded] = useState(initial);

  // Re-seed when a different address is opened for editing.
  if (open && seeded !== initial) {
    setSeeded(initial);
    setV(initial);
    setErrors({});
  }

  const set = <K extends keyof AddressDraft>(k: K, val: AddressDraft[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateAddress(v);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(v);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-ink/45"
          />
          <motion.form
            onSubmit={submit}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
            className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col bg-white"
            role="dialog"
            aria-label={title}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-extrabold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <p className="mb-2 text-xs font-bold text-ink">Save as</p>
                <div className="flex gap-2">
                  {LABELS.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("label", id)}
                      aria-pressed={v.label === id}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 text-sm font-bold transition",
                        v.label === id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:border-brand-300",
                      )}
                    >
                      <Icon className="size-4" />
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={errors.fullName}>
                  <Input
                    value={v.fullName}
                    invalid={!!errors.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Rahul Agarwal"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Mobile number" required error={errors.phone}>
                  <Input
                    value={v.phone}
                    invalid={!!errors.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="98765 43210"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <Field label="Flat, house no., building" required error={errors.line1}>
                <Input
                  value={v.line1}
                  invalid={!!errors.line1}
                  onChange={(e) => set("line1", e.target.value)}
                  placeholder="Flat 402, Silver Oak Residency"
                  autoComplete="address-line1"
                />
              </Field>

              <Field label="Area, street, sector">
                <Input
                  value={v.line2 ?? ""}
                  onChange={(e) => set("line2", e.target.value)}
                  placeholder="Sector 74A"
                  autoComplete="address-line2"
                />
              </Field>

              <Field label="Landmark" hint="Optional, helps the courier">
                <Input
                  value={v.landmark ?? ""}
                  onChange={(e) => set("landmark", e.target.value)}
                  placeholder="Opposite DAV School"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="PIN code" required error={errors.pincode}>
                  <Input
                    value={v.pincode}
                    invalid={!!errors.pincode}
                    onChange={(e) =>
                      set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="160055"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </Field>
                <Field label="City" required error={errors.city}>
                  <Input
                    value={v.city}
                    invalid={!!errors.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Mohali"
                    autoComplete="address-level2"
                  />
                </Field>
                <Field label="State" required>
                  <Select
                    value={v.state}
                    onChange={(e) => set("state", e.target.value)}
                    autoComplete="address-level1"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="rounded-2xl border-2 border-line p-4">
                <Checkbox
                  checked={v.isDefault}
                  onChange={(val) => set("isDefault", val)}
                  label="Make this my default address"
                  hint="Used automatically at checkout."
                />
              </div>
            </div>

            <footer className="flex gap-2 border-t border-line p-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-[1.6]">
                Save address
              </Button>
            </footer>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
