/**
 * Formatting helpers.
 *
 * Kept in their own module because `lib/data.ts` now imports `server-only`,
 * which throws if it reaches the client bundle. Client components need these
 * two functions and nothing else from the repository, so they import here.
 */

export const inr = (n: number) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const discountPct = (mrp: number, price: number) =>
  mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
