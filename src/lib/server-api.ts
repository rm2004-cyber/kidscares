import { BASE_URL } from "@/utils/service";

/*
 * Deliberately NOT marked `server-only`.
 *
 * `app/not-found.tsx` and `app/sitemap.ts` are compiled in a context Next
 * still treats as Pages-Router-compatible, and the `server-only` guard throws
 * there. The real protection is structural: every client component imports its
 * formatters from `lib/format`, so nothing in the browser bundle reaches this
 * module. `fetch` with `next: { revalidate }` is a no-op outside a server
 * render anyway.
 */

/**
 * Server-side reads for React Server Components.
 *
 * The browser helpers in `utils/service.js` rely on cookies and `window`;
 * these run during render instead, so they take an explicit `revalidate` and
 * feed Next's data cache. Anything user-specific must NOT come through here —
 * it would be cached across visitors.
 */

type FetchOptions = {
  /** Seconds before Next re-fetches. 0 disables caching entirely. */
  revalidate?: number;
  tags?: string[];
};

async function serverGet<T>(
  path: string,
  { revalidate = 300, tags }: FetchOptions = {},
): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      next: revalidate === 0 ? { revalidate: 0 } : { revalidate, tags },
      headers: { accept: "application/json" },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as T) : null;
  } catch {
    // A page must still render if the API is briefly unreachable; callers
    // fall back to their seed data rather than throwing a 500.
    return null;
  }
}

async function serverGetPaged<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<{ data: T[]; meta: { total: number; page: number; pages: number } } | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: opts.revalidate ?? 300, tags: opts.tags },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? { data: json.data, meta: json.meta } : null;
  } catch {
    return null;
  }
}

const qs = (params: Record<string, unknown> = {}) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const serverApi = {
  products: (params?: Record<string, unknown>) =>
    serverGetPaged<Record<string, unknown>>(`/products${qs(params)}`, { tags: ["products"] }),
  product: (slug: string) =>
    serverGet<Record<string, unknown>>(`/products/${slug}`, { tags: ["products"] }),
  categories: () => serverGet<Record<string, unknown>[]>("/categories", { tags: ["categories"] }),
  category: (slug: string) =>
    serverGet<Record<string, unknown>>(`/categories/${slug}`, { tags: ["categories"] }),
  brands: () => serverGet<Record<string, unknown>[]>("/brands", { tags: ["brands"] }),
  ageGroups: () => serverGet<Record<string, unknown>[]>("/age-groups", { tags: ["ages"] }),
  banners: (placement = "hero") =>
    serverGet<Record<string, unknown>[]>(`/banners${qs({ placement })}`, {
      revalidate: 60,
      tags: ["banners"],
    }),
  deals: () => serverGet<Record<string, unknown>[]>("/deals", { revalidate: 60, tags: ["deals"] }),
  coupons: () => serverGet<Record<string, unknown>[]>("/coupons", { revalidate: 60 }),
  settings: () => serverGet<Record<string, unknown>>("/settings", { revalidate: 60 }),
};
