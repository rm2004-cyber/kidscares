"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Globe, Sparkles, X } from "lucide-react";
import { Card, Field, Input, Textarea, Toggle } from "./ui";
import { suggestSeo, type SuggestInput } from "@/lib/admin/seoSuggest";
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

/* Each step is shown while the generator works. The work itself is instant —
   the pacing exists so the admin can see what was considered, and so three
   fields do not change under the cursor in a single frame. */
const STAGES = [
  "Reading product details",
  "Fitting the title to 60 characters",
  "Writing the description",
  "Picking keywords",
];

export function SeoEditor({
  value,
  onChange,
  fallbackTitle,
  fallbackDescription,
  urlPath,
  suggestInput,
}: {
  value: SeoValue;
  onChange: (next: SeoValue) => void;
  /** Shown greyed in the preview when the SEO field is left blank. */
  fallbackTitle: string;
  fallbackDescription: string;
  urlPath: string;
  /** Product context for the auto-fill. Omitted disables the button. */
  suggestInput?: SuggestInput;
}) {
  const [keywordDraft, setKeywordDraft] = useState("");
  const [stage, setStage] = useState(-1);
  const [filled, setFilled] = useState<Set<keyof SeoValue>>(new Set());
  /** Which field is mid-type, so the preview can show a caret on it. */
  const [typing, setTyping] = useState<"title" | "description" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  /* Every pending step is cancelled on unmount, or navigating away mid-run
     would write into a component that no longer exists. */
  useEffect(() => {
    const t = timers.current;
    const iv = intervals.current;
    return () => {
      t.forEach(clearTimeout);
      iv.forEach(clearInterval);
    };
  }, []);

  const canSuggest = Boolean(suggestInput?.title?.trim());

  /**
   * Types a string into one field a few characters at a time.
   *
   * Writes against a snapshot taken when the run started rather than reading
   * `value` on each tick — the prop in this closure is a render old, so
   * building on it would drop whatever the previous stage just wrote.
   */
  const typeInto = (
    base: SeoValue,
    key: "title" | "description",
    text: string,
    { step = 3, tick = 14 }: { step?: number; tick?: number } = {},
  ) =>
    new Promise<void>((resolve) => {
      let i = 0;
      const id = setInterval(() => {
        i = Math.min(text.length, i + step);
        onChange({ ...base, [key]: text.slice(0, i) });
        setTyping(i < text.length ? key : null);
        if (i >= text.length) {
          clearInterval(id);
          resolve();
        }
      }, tick);
      intervals.current.push(id);
    });

  const after = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(setTimeout(resolve, ms));
    });

  const generate = async () => {
    if (!suggestInput || stage >= 0) return;

    const next = suggestSeo(suggestInput);
    /* Frozen at click time so each stage builds on the last one's output. */
    const base: SeoValue = { ...value };

    setFilled(new Set());
    setStage(0);
    await after(300);

    setStage(1);
    await after(240);

    setStage(2);
    await typeInto(base, "title", next.title, { step: 2, tick: 16 });
    base.title = next.title;
    setFilled((f) => new Set(f).add("title"));
    await after(180);

    setStage(3);
    await typeInto(base, "description", next.description, { step: 3, tick: 13 });
    base.description = next.description;
    setFilled((f) => new Set(f).add("description"));
    await after(160);

    /* Keywords land one at a time — a chip list appearing all at once reads as
       a paste, one at a time reads as a decision per keyword. */
    const merged = [...new Set([...base.keywords, ...next.keywords])].slice(0, 8);
    for (let i = base.keywords.length; i <= merged.length; i += 1) {
      onChange({ ...base, keywords: merged.slice(0, i) });
      await after(85);
    }

    setFilled((f) => new Set(f).add("keywords"));
    setStage(-1);
    setTyping(null);
  };

  const busy = stage >= 0;

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
      actions={
        <button
          type="button"
          onClick={generate}
          disabled={!canSuggest || busy}
          title={
            canSuggest
              ? "Fill these from the product details"
              : "Add a product title first"
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
            "bg-gradient-to-r from-grape-500 to-brand-500 text-white",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Sparkles className={cn("size-3.5", busy && "animate-pulse")} />
          {busy ? "Working…" : "Auto-generate"}
        </button>
      }
    >
      {/* Progress. Each step ticks as it completes so the admin can see what
          the text was built from, rather than three fields changing at once. */}
      {busy && (
        <ul className="mb-4 space-y-1.5 rounded-xl border border-grape-200 bg-grape-100/40 p-3">
          {STAGES.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-[11px] transition-opacity",
                i > stage ? "opacity-40" : "opacity-100",
              )}
            >
              <span
                className={cn(
                  "grid size-3.5 shrink-0 place-items-center rounded-full",
                  i < stage ? "bg-mint-500" : i === stage ? "bg-grape-500" : "bg-line",
                )}
              >
                {i < stage && <Check className="size-2.5 text-white" strokeWidth={4} />}
                {i === stage && (
                  <span className="size-1.5 animate-ping rounded-full bg-white" />
                )}
              </span>
              <span className={i === stage ? "font-bold text-ink" : "text-ink-soft"}>
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}
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
            {typing === "title" && <Caret />}
          </p>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft",
              !value.description && "italic opacity-70",
            )}
          >
            {effectiveDesc || "No description set."}
            {typing === "description" && <Caret />}
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
            readOnly={busy}
            className={cn(
              filled.has("title") && "ring-2 ring-grape-300",
              busy && "cursor-default",
            )}
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
            readOnly={busy}
            className={cn(
              filled.has("description") && "ring-2 ring-grape-300",
              busy && "cursor-default",
            )}
          />
          <Meter length={effectiveDesc.length} max={DESC_MAX} />
        </Field>

        <Field label="Keywords" hint="Enter or comma to add">
          <div
            className={cn(
              "rounded-xl border border-line bg-white p-2",
              filled.has("keywords") && "ring-2 ring-grape-300",
            )}
          >
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
          {!busy && filled.has("description") && effectiveDesc.length < 120 && (
            <p className="mb-2 rounded-lg bg-white px-2.5 py-2 text-[11px] leading-relaxed text-ink-soft">
              The description is short because there was little to describe.
              Fill in the material, highlights or age group above and generate
              again for a fuller one.
            </p>
          )}

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

/** Blinking block that follows the text as it streams in. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-px inline-block w-[2px] animate-pulse self-stretch bg-current align-text-bottom"
      style={{ height: "1em" }}
    />
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
