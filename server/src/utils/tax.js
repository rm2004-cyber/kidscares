import { env } from "../config/env.js";

/**
 * Breaks GST out of a tax-INCLUSIVE amount.
 *
 * Listed prices already include GST, so the tax is extracted rather than added:
 *   taxable = gross / (1 + rate/100)
 *
 * Intra-state sales split into CGST + SGST; inter-state is a single IGST at the
 * full rate. Which applies is decided by comparing the buyer's state with the
 * seller's registered state.
 */
export function computeTax({ gross, buyerState, rate = env.tax.gstRate }) {
  const taxableValue = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  const taxTotal = Math.round((gross - taxableValue) * 100) / 100;

  const intraState =
    String(buyerState ?? "").trim().toLowerCase() ===
    env.tax.sellerState.trim().toLowerCase();

  if (intraState) {
    const half = Math.round((taxTotal / 2) * 100) / 100;
    return {
      rate,
      taxableValue,
      cgst: half,
      // Assign the rounding remainder to SGST so the parts always sum to total.
      sgst: Math.round((taxTotal - half) * 100) / 100,
      igst: 0,
      total: taxTotal,
      placeOfSupply: buyerState ?? "",
      intraState: true,
    };
  }

  return {
    rate,
    taxableValue,
    cgst: 0,
    sgst: 0,
    igst: taxTotal,
    total: taxTotal,
    placeOfSupply: buyerState ?? "",
    intraState: false,
  };
}
