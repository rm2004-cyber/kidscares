"use client";

import { useState } from "react";
import { AlertTriangle, Check, Globe, X } from "lucide-react";
import { Card, Field, Input, Textarea, Toggle } from "./ui";
import { cn } from "@/lib/utils";

export type SeoValue = {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  index: boolean;
  follow: boolean;
};

/* Google truncates around these lengths; the counters warn before that. */
const TITLE_MAX = 60;
const DESC_MAX = 155;

export function SeoEditor({
  value,
  onChange,
  fallbackTitle,
  fallbackDescription,
  urlPath,
}: {
  value: SeoValue;
  onChange: (next: SeoValue) => void;
  /** Shown greyed in the preview when the SEO field is left blank. */
  fallbackTitle: string;
  fallbackDescription: string;
  urlPath: string;
}) {
  const [keywordDraft, setKeywordDraft] = useState("");

  const set = <K extends keyof SeoValue>(key: K, v: SeoValue[K]) =>
    onChange({ ...value, [key]: v });

  const effectiveTitle = value.title || fallbackTitle;
  const effectiveDesc = value.description || fallbackDescription;

  const addKeyword = () => {
    const k = keywordDraft.trim().replace(/,$/, "");
    if (k && !value.keywords.includes(k)) {
      set("keywords", [...value.keywords, k]);
    }
    setKeywordDraft("");
  };

  /* A short, honest checklist. Each item maps to something that measurably
     affects how the page is presented in results. */
  const checks = [
    {
      ok: effectiveTitle.length > 0 && effectiveTitle.length <= TITLE_MAX,
      label: `Title within ${TITLE_MAX} characters`,
    },
    {
      ok: effectiveDesc.length >= 70 && effectiveDesc.length <= DESC_MAX,
      label: `Description between 70 and ${DESC_MAX} characters`,
    },
    { ok: value.keywords.length >= 3, label: "At least 3 keywords" },
    { ok: value.index, label: "Page is indexable" },
  ];
  const passed = checks.filter((c) => c.ok).length;

  return (
    <Card
      title="Search engine listing"
      description="Overrides the auto-generated tags. Leave blank to use the defaults."
    >
      {/* Live SERP preview */}
      <div className="mb-5 rounded-xl border border-line bg-cream p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          <Globe className="size-3" />
          Google preview
        </p>
        <div className="rounded-lg bg-white p-3">
          <p className="truncate text-[11px] text-ink-muted">
            kidscares.example{urlPath}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-base leading-snug text-[#1a0dab]",
              !value.title && "italic opacity-70",
            )}
          >
            {effectiveTitle || "Untitled page"}
          </p>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft",
              !value.description && "italic opacity-70",
            )}
          >
            {effectiveDesc || "No description set."}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Field
          label="Meta title"
          hint={`${effectiveTitle.length}/${TITLE_MAX}`}
        >
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={fallbackTitle}
          />
          <Meter length={effectiveTitle.length} max={TITLE_MAX} />
        </Field>

        <Field
          label="Meta description"
          hint={`${effectiveDesc.length}/${DESC_MAX}`}
        >
          <Textarea
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={fallbackDescription}
          />
          <Meter length={effectiveDesc.length} max={DESC_MAX} />
        </Field>

        <Field label="Keywords" hint="Enter or comma to add">
          <div className="rounded-xl border border-line bg-white p-2">
            <div className="flex flex-wrap gap-1.5">
              {value.keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-lg bg-cream px-2 py-1 text-[11px] font-semibold text-ink"
                >
                  {k}
                  <button
                    type="button"
                    onClick={() => set("keywords", value.keywords.filter((x) => x !== k))}
                    aria-label={`Remove ${k}`}
                    className="text-ink-muted hover:text-brand-600"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeyword();
                  }
                  if (e.key === "Backspace" && !keywordDraft && value.keywords.length) {
                    set("keywords", value.keywords.slice(0, -1));
                  }
                }}
                onBlur={addKeyword}
                placeholder={value.keywords.length ? "" : "kids romper, cotton onesie…"}
                aria-label="Add keyword"
                className="min-w-32 flex-1 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-ink-muted"
              />
            </div>
          </div>
        </Field>

        <Field label="Canonical URL" hint="Leave blank to use this page's own URL">
          <Input
            value={value.canonical}
            onChange={(e) => set("canonical", e.target.value)}
            placeholder={`https://kidscares.example${urlPath}`}
          />
        </Field>

        <div className="rounded-xl border border-line p-3">
          <Toggle
            checked={value.index}
            onChange={(v) => set("index", v)}
            label="Allow indexing"
            hint="Turn off to add noindex — the page stays live but leaves search results."
          />
          <div className="mt-2 border-t border-line pt-2">
            <Toggle
              checked={value.follow}
              onChange={(v) => set("follow", v)}
              label="Follow links"
              hint="Turn off to add nofollow to links on this page."
            />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-cream p-3">
          <p className="mb-2 flex items-center justify-between text-xs font-bold text-ink">
            SEO checklist
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px]",
                passed === checks.length
                  ? "bg-mint-100 text-mint-700"
                  : "bg-sun-100 text-amber-700",
              )}
            >
              {passed}/{checks.length}
            </span>
          </p>
          <ul className="space-y-1">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
                {c.ok ? (
                  <Check className="size-3 shrink-0 text-mint-600" strokeWidth={3} />
                ) : (
                  <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                )}
                <span className={c.ok ? "text-ink-soft" : "font-semibold text-ink"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Meter({ length, max }: { length: number; max: number }) {
  const pct = Math.min(100, (length / max) * 100);
  const over = length > max;
  return (
    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-line">
      <span
        className={cn(
          "block h-full rounded-full transition-all",
          over ? "bg-red-500" : pct > 80 ? "bg-sun-400" : "bg-mint-400",
        )}
        style={{ width: `${over ? 100 : pct}%` }}
      />
    </span>
  );
}
