"use client";

import { useEffect, useState } from "react";
import { GripVertical, Plus, Save, Star, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import type { SiteSettings } from "@/lib/admin/types";
import { adminApi, ApiError } from "@/utils/service";
import { defaultSettings } from "@/lib/admin/mock";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "store", label: "Store" },
  { id: "delivery", label: "Delivery & Payments" },
  { id: "announcements", label: "Announcement Bar" },
  { id: "seo", label: "SEO & Analytics" },
  { id: "social", label: "Social" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminSettingsView() {
  const [s, setS] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("store");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((live) => {
        /* Merged over the defaults so a field the API has not stored yet still
           renders with a sensible value instead of undefined. */
        if (live) setS((prev) => ({ ...prev, ...(live as SiteSettings) }));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load settings."),
      )
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    console.log("settings payload", s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Values here are read by the storefront at render time."
        actions={
          <Button size="sm" onClick={save}>
            <Save className="size-4" />
            {saved ? "Saved" : "Save changes"}
          </Button>
        }
      />

      {saved && (
        <div className="mb-4 rounded-xl border border-mint-200 bg-mint-50 px-4 py-2.5 text-sm font-semibold text-mint-700">
          Settings payload logged to the console — persistence lands with the
          backend phase.
        </div>
      )}

      {/* Tabs scroll horizontally on narrow screens instead of wrapping. */}
      <div className="rail mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <Card title="Store details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <Input
                value={s.storeName}
                onChange={(e) => set("storeName", e.target.value)}
              />
            </Field>
            <Field label="Support phone">
              <Input
                value={s.supportPhone}
                onChange={(e) => set("supportPhone", e.target.value)}
              />
            </Field>
            <Field label="Support email" className="sm:col-span-2">
              <Input
                type="email"
                value={s.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === "delivery" && (
        <div className="space-y-4">
          <Card
            title="Free delivery"
            description="Drives the cart progress bar and the announcement copy"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Free delivery above (₹)" required>
                <Input
                  type="number"
                  min={0}
                  value={s.freeDeliveryThreshold}
                  onChange={(e) =>
                    set("freeDeliveryThreshold", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Flat shipping below threshold (₹)">
                <Input
                  type="number"
                  min={0}
                  value={s.shippingFlatRate}
                  onChange={(e) => set("shippingFlatRate", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="mt-4 rounded-xl bg-cream p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                Cart preview
              </p>
              <p className="text-xs font-medium text-ink-soft">
                Add <b className="text-brand-600">{inr(Math.round(s.freeDeliveryThreshold * 0.4))}</b>{" "}
                more for free delivery
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full w-[60%] rounded-full bg-mint-400" />
              </div>
              <p className="mt-2 text-[11px] text-ink-muted">
                Orders below {inr(s.freeDeliveryThreshold)} are charged{" "}
                {inr(s.shippingFlatRate)}.
              </p>
            </div>
          </Card>

          <Card title="Cash on delivery">
            <div className="rounded-xl border border-line p-3">
              <Toggle
                checked={s.codEnabled}
                onChange={(v) => set("codEnabled", v)}
                label="Enable cash on delivery"
                hint="Shown as a payment option at checkout."
              />
            </div>
            {s.codEnabled && (
              <Field label="Maximum COD order value (₹)" className="mt-4">
                <Input
                  type="number"
                  min={0}
                  value={s.codMaxOrderValue}
                  onChange={(e) => set("codMaxOrderValue", Number(e.target.value))}
                />
              </Field>
            )}
          </Card>
        </div>
      )}

      {tab === "announcements" && (
        <Card
          title="Announcement bar"
          description="Scrolling messages above the header"
        >
          <div className="mb-4 rounded-xl border border-line p-3">
            <Toggle
              checked={s.announcementEnabled}
              onChange={(v) => set("announcementEnabled", v)}
              label="Show announcement bar"
            />
          </div>

          {s.announcementEnabled && (
            <>
              <div className="mb-4 overflow-hidden rounded-xl bg-ink py-2">
                <div className="flex gap-8 whitespace-nowrap px-4">
                  {s.announcements.slice(0, 3).map((m, i) => (
                    <span key={i} className="flex items-center gap-2 text-xs font-medium text-white">
                      <Star className="size-3 fill-sun-300 text-sun-300" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="space-y-2">
                {s.announcements.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 cursor-grab text-ink-muted" />
                    <Input
                      value={m}
                      onChange={(e) => {
                        const next = [...s.announcements];
                        next[i] = e.target.value;
                        set("announcements", next);
                      }}
                      aria-label={`Message ${i + 1}`}
                    />
                    <button
                      onClick={() =>
                        set("announcements", s.announcements.filter((_, j) => j !== i))
                      }
                      aria-label="Remove message"
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => set("announcements", [...s.announcements, ""])}
              >
                <Plus className="size-4" />
                Add message
              </Button>
            </>
          )}
        </Card>
      )}

      {tab === "seo" && (
        <div className="space-y-4">
          <Card
            title="Global SEO defaults"
            description="Used wherever a page does not set its own"
          >
            <div className="space-y-4">
              <Field
                label="Title template"
                hint="%s is replaced by the page title"
              >
                <Input
                  value={s.seo.titleTemplate}
                  onChange={(e) =>
                    set("seo", { ...s.seo, titleTemplate: e.target.value })
                  }
                  placeholder="%s | KidsCare"
                />
              </Field>

              <Field label="Default title" hint={`${s.seo.defaultTitle.length}/60`}>
                <Input
                  value={s.seo.defaultTitle}
                  onChange={(e) =>
                    set("seo", { ...s.seo, defaultTitle: e.target.value })
                  }
                />
              </Field>

              <Field
                label="Default description"
                hint={`${s.seo.defaultDescription.length}/155`}
              >
                <Textarea
                  value={s.seo.defaultDescription}
                  onChange={(e) =>
                    set("seo", { ...s.seo, defaultDescription: e.target.value })
                  }
                />
              </Field>

              <div className="rounded-xl border border-line p-3">
                <Toggle
                  checked={s.seo.robotsIndex}
                  onChange={(v) => set("seo", { ...s.seo, robotsIndex: v })}
                  label="Allow search engines to index the site"
                  hint="Turn off only for a staging environment — this noindexes everything."
                />
              </div>
            </div>
          </Card>

          <Card title="Verification & analytics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Google Search Console" hint="Verification token">
                <Input
                  value={s.seo.googleSiteVerification}
                  onChange={(e) =>
                    set("seo", { ...s.seo, googleSiteVerification: e.target.value })
                  }
                  placeholder="google-site-verification=…"
                />
              </Field>
              <Field label="Bing Webmaster" hint="Verification token">
                <Input
                  value={s.seo.bingSiteVerification}
                  onChange={(e) =>
                    set("seo", { ...s.seo, bingSiteVerification: e.target.value })
                  }
                />
              </Field>
              <Field label="Google Analytics" hint="Measurement ID" className="sm:col-span-2">
                <Input
                  value={s.seo.gaMeasurementId}
                  onChange={(e) =>
                    set("seo", { ...s.seo, gaMeasurementId: e.target.value })
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {tab === "social" && (
        <Card title="Social profiles" description="Linked from the footer">
          <div className="space-y-4">
            {(["instagram", "facebook", "youtube"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                <Input
                  value={s.social[k]}
                  onChange={(e) =>
                    set("social", { ...s.social, [k]: e.target.value })
                  }
                  placeholder={`https://${k}.com/kidscare`}
                />
              </Field>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
