import type { ProductFormValue } from "./productForm";

/**
 * Builds search-engine tags from what the product form already knows.
 *
 * Deliberately not a language model. The two things that matter here are the
 * character budgets — Google truncates titles around 60 and descriptions
 * around 155 — and never claiming something the seller did not type. On a
 * children's store an invented "BPA-free" or "pediatrician approved" is a
 * liability, so every fragment below is assembled from fields the admin filled
 * in themselves.
 *
 * Deterministic on purpose: regenerating the same product must give the same
 * text, or the description flip-flops between crawls and Google starts writing
 * its own snippet instead.
 */

const TITLE_MAX = 60;
const DESC_MAX = 155;
const DESC_MIN = 120;

export type SeoSuggestion = {
  title: string;
  description: string;
  keywords: string[];
};

export type SuggestInput = Pick<
  ProductFormValue,
  "title" | "brand" | "description" | "highlights" | "safety" | "price" | "mrp" | "badge" | "colors" | "sizes"
> & {
  /** Human labels, not slugs — "Toys", not "toys/puzzles". */
  categoryLabel?: string;
  ageLabels?: string[];
  /** Seeds the opening verb so wording varies across the catalogue. */
  slug?: string;
  storeName?: string;
  freeDeliveryOver?: number;
};

/* ─────────────────────────────── helpers ──────────────────────────────── */

/** Strips markup and collapses whitespace; seller copy is often pasted. */
function clean(s: string | undefined): string {
  return (s ?? "")
    .replace(/<[^>]*>/g, " ")
    /* Straight and smart double quotes both make Google cut the snippet
       short at the quote, so they never reach the output. */
    .replace(/["""]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trims at a word boundary, never mid-word. */
function trimWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:\-–—]+$/, "").trim();
}

/** Sentence-cases a fragment and gives it a full stop. */
function sentence(s: string): string {
  const t = clean(s).replace(/[.!?]+$/, "");
  if (!t) return "";
  return `${t[0].toUpperCase()}${t.slice(1)}.`;
}

/** Stable small hash — same slug always picks the same opener. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const OPENERS = ["Shop the", "Buy the", "Meet the", "Bring home the"];

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/**
 * Discount, but only once both prices are real.
 *
 * A half-filled form has mrp set and price still empty, which naively reads as
 * 100% off — and a meta title promising "100% Off" would be published the
 * moment the product went live.
 */
function discountPct(input: Pick<SuggestInput, "price" | "mrp">): number {
  const price = Number(input.price);
  const mrp = Number(input.mrp);
  if (!(price > 0) || !(mrp > price)) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/* ──────────────────────────────── title ───────────────────────────────── */

/**
 * Keyword first, then whatever else fits.
 *
 * Suffixes are dropped from the right when the budget runs out, so the product
 * name — the part a shopper actually searches for — is never the thing that
 * gets cut.
 */
export function suggestTitle(input: SuggestInput): string {
  const name = clean(input.title);
  if (!name) return "";

  const store = input.storeName ?? "KidsCares";
  const off = discountPct(input);

  /* Ordered least to most disposable. */
  const suffixes = [
    input.brand ? ` by ${clean(input.brand)}` : "",
    off >= 5 ? ` — ${off}% Off` : "",
    ` | ${store}`,
  ].filter(Boolean);

  for (let drop = 0; drop <= suffixes.length; drop += 1) {
    const candidate = name + suffixes.slice(0, suffixes.length - drop).join("");
    if (candidate.length <= TITLE_MAX) return candidate;
  }

  /* The name alone overflows. Trimming from the end would drop the product
     noun — "Premium Handcrafted Organic Bamboo Fibre Full-Sleeve Winter" has
     lost the word "Romper", which is the one word people search for. So keep
     the tail and elide the middle instead. */
  return trimKeepingTail(name, TITLE_MAX);
}

/** Trims the middle, keeping the opening words and the closing noun phrase. */
function trimKeepingTail(s: string, max: number): string {
  const words = s.split(" ");
  const tail = words.slice(-2).join(" ");
  /* No room for an elision — fall back to a plain trim. */
  if (tail.length + 6 >= max) return trimWords(s, max);

  const budget = max - tail.length - 2; // "… "
  const head = trimWords(words.slice(0, -2).join(" "), budget);
  return `${head}… ${tail}`;
}

/* ───────────────────────────── description ────────────────────────────── */

/**
 * Assembles the description from ranked fragments until the budget is spent.
 *
 * Each slot has a fallback chain, so a sparse product still produces a full
 * sentence rather than a stub. Fragments that would overflow are skipped
 * rather than truncated — a clipped half-sentence reads worse than a shorter
 * complete one.
 */
export function suggestDescription(input: SuggestInput): string {
  const name = clean(input.title);
  if (!name) return "";

  const brand = clean(input.brand);
  const opener = OPENERS[hash(input.slug || name) % OPENERS.length];
  const store = input.storeName ?? "KidsCares";

  /* Slot 1 — the primary keyword, always present. */
  const lead = sentence(
    `${opener} ${name}${brand ? ` by ${brand}` : ""}${brand ? "" : ` at ${store}`}`,
  );

  /* Slot 2 — the strongest concrete attribute the seller gave us. */
  const attribute =
    input.safety?.material
      ? sentence(`Made from ${clean(input.safety.material)}`)
      : input.safety?.certification
        ? sentence(clean(input.safety.certification))
        : input.highlights?.[0]
          ? sentence(input.highlights[0])
          : input.categoryLabel
            ? sentence(`${clean(input.categoryLabel)} from our kids' range`)
            : "";

  /* Slot 3 — who it fits. */
  const ages = (input.ageLabels ?? []).map(clean).filter(Boolean);
  const sizes = (input.sizes ?? []).map(clean).filter(Boolean);
  const fit = ages.length
    ? sentence(`For ages ${ages.slice(0, 2).join(" and ")}`)
    : sizes.length > 1
      ? sentence(`Available in sizes ${sizes[0]} to ${sizes[sizes.length - 1]}`)
      : "";

  /* Slot 4 — the reason to click rather than scroll past. */
  const off = discountPct(input);
  const hook =
    off >= 5
      ? sentence(`Now ${off}% off at ${inr(input.price)}`)
      : input.badge
        ? sentence(String(input.badge).replace(/-/g, " "))
        : input.highlights?.[1]
          ? sentence(input.highlights[1])
          : "";

  /* Slot 5 — soft call to action, first to go when space is tight. */
  const cta = input.freeDeliveryOver
    ? sentence(`Free delivery over ${inr(input.freeDeliveryOver)}`)
    : sentence(`Shop now at ${store}`);

  /* Closers for products with almost nothing filled in — graded by length so
     a small remaining gap can be closed by a short one rather than left open.
     Every line restates something already on the page; none is a new claim. */
  const closers = [
    Number(input.price) > 0 ? sentence(`Priced at ${inr(input.price)}`) : "",
    brand ? sentence(`More from ${brand}`) : "",
    input.categoryLabel ? sentence(`Explore more ${clean(input.categoryLabel)}`) : "",
    sentence(`Shop now at ${store}`),
  ].filter(Boolean);

  const slots = [attribute, fit, hook, cta].filter(Boolean);

  let out = lead;
  const skipped: string[] = [];
  for (const part of slots) {
    if (out.length + 1 + part.length <= DESC_MAX) out += ` ${part}`;
    else skipped.push(part);
  }

  /* Below the useful minimum, a shorter skipped fragment is better than a
     description Google pads out with page text of its own choosing. */
  /* Short of the useful minimum, close the gap with the longest fragment that
     still fits — a description Google considers too thin gets replaced with
     page text it picks itself. */
  const pool = [...skipped, ...closers];
  while (out.length < DESC_MIN) {
    const room = DESC_MAX - out.length - 1;
    const pick = pool
      .filter((p) => !out.includes(p) && p.length <= room)
      .sort((a, b) => b.length - a.length)[0];
    if (!pick) break;
    out += ` ${pick}`;
  }

  /* Repeating the store name reads as padding to a shopper and as stuffing to
     a crawler, so a thin-data description stays short rather than saying
     "KidsCares" three times. */
  return dedupeStore(out, store);
}

/** Keeps at most two mentions of the store name, dropping whole sentences. */
function dedupeStore(text: string, store: string): string {
  const parts = text.split(/(?<=\.)\s+/);
  let seen = 0;
  return parts
    .filter((p) => {
      if (!p.includes(store)) return true;
      seen += 1;
      return seen <= 2;
    })
    .join(" ")
    .trim();
}

/* ────────────────────────────── keywords ──────────────────────────────── */

/**
 * A short list of real phrases people type — not every word in the title.
 *
 * Meta keywords carry no ranking weight at Google, but they are used across
 * this site for internal search and related-product matching, so they are
 * worth getting right.
 */
export function suggestKeywords(input: SuggestInput): string[] {
  const name = clean(input.title).toLowerCase();
  const brand = clean(input.brand).toLowerCase();
  const category = clean(input.categoryLabel).toLowerCase();
  const material = clean(input.safety?.material).toLowerCase();
  const colour = clean(input.colors?.[0]?.name).toLowerCase();

  const out = [
    name,
    brand,
    category && `${category} for kids`,
    ...(input.ageLabels ?? []).map((a) => clean(a).toLowerCase()),
    material,
    colour && category && `${colour} ${category}`,
    /* The last two words of the name usually are the product type on its own
       — "full-sleeve romper" → "romper". Worth having as a broad term. */
    name.split(" ").slice(-2).join(" "),
  ]
    .map((k) => (k ?? "").trim())
    .filter((k) => k.length > 2);

  /* Anything longer than a real search phrase is the full product name with
     every adjective attached — nobody types that. */
  return [...new Set(out)].filter((k) => k.length <= 45).slice(0, 8);
}

/** Everything at once — what the Generate button calls. */
export function suggestSeo(input: SuggestInput): SeoSuggestion {
  return {
    title: suggestTitle(input),
    description: suggestDescription(input),
    keywords: suggestKeywords(input),
  };
}
