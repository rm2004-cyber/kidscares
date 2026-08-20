"use client";

import { useState } from "react";
import { Camera, KeyRound, Save, Trash2 } from "lucide-react";
import {
  Button,
  Field,
  Input,
  SectionCard,
  Select,
  Toggle,
} from "@/components/ui/Form";

type Pref = { key: string; label: string; hint: string; locked?: boolean };

/* Order updates are transactional, so they cannot be switched off. */
const PREFS: Pref[] = [
  { key: "orderUpdates", label: "Order updates", hint: "Dispatch, delivery and return alerts.", locked: true },
  { key: "offers", label: "Offers and deals", hint: "Sale alerts and coupon drops." },
  { key: "restock", label: "Back in stock", hint: "When a saved item returns to stock." },
  { key: "newsletter", label: "Parenting newsletter", hint: "Age-appropriate picks, once a month." },
];

export function AccountSettingsView() {
  const [profile, setProfile] = useState({
    fullName: "Rahul Agarwal",
    email: "rahul@example.com",
    phone: "+91 98765 43210",
    dob: "",
    gender: "",
  });

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    orderUpdates: true,
    offers: true,
    restock: true,
    newsletter: false,
  });

  const [channels, setChannels] = useState({ email: true, sms: true, whatsapp: false });
  const [saved, setSaved] = useState(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // Persistence lands with the backend phase; the payload is already final.
    console.log("account settings", { profile, prefs, channels });
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <form onSubmit={save}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Settings</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Your details and how we contact you.
          </p>
        </div>
        <Button type="submit" size="sm">
          <Save className="size-4" />
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>

      {saved && (
        <p className="mb-4 rounded-2xl border-2 border-mint-200 bg-mint-50 px-4 py-2.5 text-sm font-semibold text-mint-700">
          Changes captured. Persistence arrives with the backend phase.
        </p>
      )}

      <div className="space-y-4">
        <SectionCard title="Profile">
          <div className="mb-5 flex items-center gap-4">
            <span className="relative grid size-20 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-2xl font-extrabold text-brand-700">
              {profile.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
              <button
                type="button"
                aria-label="Change photo"
                className="absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full border-2 border-white bg-ink text-white transition hover:bg-brand-500"
              >
                <Camera className="size-3.5" />
              </button>
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold">{profile.fullName}</p>
              <p className="text-sm text-ink-soft">{profile.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                autoComplete="name"
              />
            </Field>
            <Field label="Mobile number" required>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Field label="Email address" required className="sm:col-span-2">
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                autoComplete="email"
              />
            </Field>
            <Field label="Date of birth" hint="For birthday offers">
              <Input
                type="date"
                value={profile.dob}
                onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
              />
            </Field>
            <Field label="Gender" hint="Optional">
              <Select
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Notifications"
          description="Order updates always stay on so you never miss a delivery."
        >
          <div className="divide-y divide-line">
            {PREFS.map((p) => (
              <div key={p.key} className="py-2 first:pt-0 last:pb-0">
                <Toggle
                  checked={p.locked ? true : prefs[p.key]}
                  onChange={(v) =>
                    !p.locked && setPrefs((s) => ({ ...s, [p.key]: v }))
                  }
                  label={p.label}
                  hint={p.locked ? `${p.hint} Always on.` : p.hint}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs font-bold text-ink">Reach me on</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["email", "sms", "whatsapp"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannels((s) => ({ ...s, [c]: !s[c] }))}
                  aria-pressed={channels[c]}
                  className={`rounded-2xl border-2 py-2.5 text-sm font-bold capitalize transition ${
                    channels[c]
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line text-ink-soft hover:border-brand-300"
                  }`}
                >
                  {c === "sms" ? "SMS" : c}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Security">
          <Button type="button" variant="outline" className="w-full justify-start">
            <KeyRound className="size-4" />
            Change password
          </Button>
        </SectionCard>

        <SectionCard title="Danger zone">
          <p className="mb-3 text-sm leading-relaxed text-ink-soft">
            Deleting your account removes your order history, saved addresses and
            wishlist. This cannot be undone.
          </p>
          <Button type="button" variant="danger" size="sm">
            <Trash2 className="size-4" />
            Delete my account
          </Button>
        </SectionCard>
      </div>
    </form>
  );
}
