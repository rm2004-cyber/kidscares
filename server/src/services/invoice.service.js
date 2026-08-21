import { env } from "../config/env.js";

/**
 * Invoice as printable HTML.
 *
 * Deliberately not a PDF library: Puppeteer would add ~300MB to the image and
 * a Chromium process per request, and pdfkit means hand-laying every line. The
 * browser's own print-to-PDF renders this correctly, costs nothing, and the
 * page is also readable on screen.
 */

const inr = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const esc = (v = "") =>
  String(v).replace(/[<>&"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;",
  );

export function renderInvoice({ order, user, settings }) {
  const a = order.address ?? {};
  const tax = order.tax ?? {};
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rows = order.items
    .map((i, n) => {
      const gross = i.price * i.qty;
      // Line-level taxable value, derived the same way as the order total so
      // the column sums match the summary exactly.
      const taxable = tax.rate ? gross / (1 + tax.rate / 100) : gross;
      return `<tr>
        <td>${n + 1}</td>
        <td>
          <strong>${esc(i.title)}</strong><br/>
          <span class="muted">${esc([i.brand, i.size && `Size ${i.size}`, i.color].filter(Boolean).join(" · "))}</span>
        </td>
        <td class="num">${i.qty}</td>
        <td class="num">${inr(i.price)}</td>
        <td class="num">${inr(taxable)}</td>
        <td class="num">${inr(gross)}</td>
      </tr>`;
    })
    .join("");

  const taxRows =
    tax.igst > 0
      ? `<tr><td>IGST @ ${tax.rate}%</td><td class="num">${inr(tax.igst)}</td></tr>`
      : `<tr><td>CGST @ ${(tax.rate ?? 0) / 2}%</td><td class="num">${inr(tax.cgst ?? 0)}</td></tr>
         <tr><td>SGST @ ${(tax.rate ?? 0) / 2}%</td><td class="num">${inr(tax.sgst ?? 0)}</td></tr>`;

  return `<!doctype html>
<html><head><meta charset="utf-8">
<title>Invoice ${esc(order.orderNo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; color: #17202e; margin: 0; font-size: 13px; }
  .sheet { max-width: 820px; margin: 0 auto; padding: 24px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #ecebe8; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; }
  .brand span { color: #f74d3f; }
  .muted { color: #7c8798; font-size: 11px; }
  h1 { font-size: 15px; margin: 0 0 2px; letter-spacing: .5px; text-transform: uppercase; }
  .grid { display: flex; gap: 32px; margin: 20px 0; flex-wrap: wrap; }
  .grid > div { flex: 1; min-width: 200px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7c8798; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #7c8798; border-bottom: 1px solid #ecebe8; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #f3f2f0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: 300px; margin-top: 16px; }
  .totals td { border: 0; padding: 5px 6px; }
  .totals tr:last-child td { border-top: 2px solid #ecebe8; font-weight: 800; font-size: 15px; padding-top: 10px; }
  .foot { margin-top: 28px; border-top: 1px solid #ecebe8; padding-top: 12px; }
  .print { position: fixed; top: 16px; right: 16px; background: #f74d3f; color: #fff; border: 0; border-radius: 999px; padding: 10px 20px; font-weight: 700; cursor: pointer; }
  @media print { .print { display: none; } }
</style></head>
<body>
  <button class="print" onclick="window.print()">Save as PDF</button>

  <div class="sheet">
    <div class="top">
      <div>
        <p class="brand">Kids<span>Cares</span></p>
        <p class="muted">
          ${esc(settings?.storeName ?? "KidsCares Retail Pvt Ltd")}<br/>
          Sector 74, Mohali, Punjab 160055<br/>
          ${esc(settings?.supportEmail ?? "care@kidscares.example")}
        </p>
      </div>
      <div style="text-align:right">
        <h1>Tax Invoice</h1>
        <p class="muted">
          <strong style="color:#17202e;font-size:14px">${esc(order.orderNo)}</strong><br/>
          ${date}<br/>
          ${order.payment?.method === "cod" ? "Cash on delivery" : "Paid online"}
        </p>
      </div>
    </div>

    <div class="grid">
      <div>
        <p class="label">Billed to</p>
        <strong>${esc(a.fullName ?? user?.name ?? "")}</strong><br/>
        <span class="muted">
          ${esc([a.line1, a.line2].filter(Boolean).join(", "))}<br/>
          ${esc(a.city)}, ${esc(a.state)} — ${esc(a.pincode)}<br/>
          ${esc(a.phone ?? "")}<br/>
          ${esc(user?.email ?? "")}
        </span>
      </div>
      <div>
        <p class="label">Place of supply</p>
        <strong>${esc(tax.placeOfSupply || a.state || "—")}</strong><br/>
        <span class="muted">
          ${tax.intraState ? "Intra-state supply (CGST + SGST)" : "Inter-state supply (IGST)"}<br/>
          All amounts in INR. Prices are inclusive of GST.
        </span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Taxable</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      <tr><td>Taxable value</td><td class="num">${inr(tax.taxableValue ?? order.subtotal)}</td></tr>
      ${taxRows}
      ${order.discount > 0 ? `<tr><td>Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}</td><td class="num">− ${inr(order.discount)}</td></tr>` : ""}
      <tr><td>Delivery charges</td><td class="num">${order.shipping === 0 ? "FREE" : inr(order.shipping)}</td></tr>
      <tr><td>Total</td><td class="num">${inr(order.total)}</td></tr>
    </table>

    <div class="foot">
      <p class="muted">
        This is a computer-generated invoice and does not require a signature.
        Returns accepted within 30 days — see ${esc(env.siteUrl)}/help/returns.
      </p>
    </div>
  </div>
</body></html>`;
}

export const invoiceService = { renderInvoice };
