import PDFDocument from "pdfkit";
import { env } from "../config/env.js";

/**
 * Invoice PDF.
 *
 * Drawn with pdfkit rather than rendered from HTML — a headless Chromium would
 * add ~300MB to the image and spawn a browser per invoice, which is a lot to
 * carry for one A4 page. Returns a Buffer so it can be attached to an email or
 * streamed to a download without ever touching disk.
 */

const C = {
  ink: "#17202e",
  soft: "#4a5568",
  muted: "#7c8798",
  line: "#e6e5e2",
  brand: "#f74d3f",
  mint: "#14b975",
};

const rupees = (n) =>
  `Rs. ${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function generateInvoicePdf({ order, user, settings }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 46 });
    const chunks = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = doc.page.margins.left;
    const R = doc.page.width - doc.page.margins.right;
    const W = R - L;

    const a = order.address ?? {};
    const tax = order.tax ?? {};

    /* ── header ── */
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(20).text("Kids", L, 46, { continued: true });
    doc.fillColor(C.brand).text("Cares");

    doc.font("Helvetica").fontSize(8).fillColor(C.muted)
      .text(settings?.storeName ?? "KidsCares Retail Pvt Ltd", L, 70)
      .text("Sector 74, Mohali, Punjab 160055")
      .text(settings?.supportEmail ?? "care@kidscares.example");

    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink)
      .text("TAX INVOICE", L, 46, { width: W, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(C.soft)
      .text(order.orderNo, L, 66, { width: W, align: "right" })
      .text(
        new Date(order.createdAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        }),
        L, 79, { width: W, align: "right" },
      )
      .text(
        order.payment?.method === "cod" ? "Cash on delivery" : "Paid online",
        L, 92, { width: W, align: "right" },
      );

    doc.moveTo(L, 116).lineTo(R, 116).lineWidth(1).strokeColor(C.line).stroke();

    /* ── parties ── */
    let y = 130;
    const col = W / 2;

    const label = (text, x, yy) =>
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text(text.toUpperCase(), x, yy, { characterSpacing: 0.6 });

    label("Billed to", L, y);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.ink).text(a.fullName ?? user?.name ?? "", L, y + 12);
    doc.font("Helvetica").fontSize(8.5).fillColor(C.soft)
      .text([a.line1, a.line2].filter(Boolean).join(", "), L, y + 26, { width: col - 20 })
      .text(`${a.city ?? ""}, ${a.state ?? ""} - ${a.pincode ?? ""}`)
      .text(a.phone ?? "")
      .text(user?.email ?? "");

    label("Place of supply", L + col, y);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.ink)
      .text(tax.placeOfSupply || a.state || "-", L + col, y + 12);
    doc.font("Helvetica").fontSize(8.5).fillColor(C.soft)
      .text(
        tax.intraState ? "Intra-state supply (CGST + SGST)" : "Inter-state supply (IGST)",
        L + col, y + 26, { width: col },
      )
      .text("All amounts in INR. Prices inclusive of GST.");

    /* ── items table ── */
    y = 218;
    const cols = { n: L, item: L + 22, qty: L + 300, rate: L + 340, taxable: L + 410, amount: L + 480 };

    doc.rect(L, y - 6, W, 20).fill("#faf9f7");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted);
    doc.text("#", cols.n, y);
    doc.text("ITEM", cols.item, y);
    doc.text("QTY", cols.qty, y, { width: 30, align: "right" });
    doc.text("RATE", cols.rate, y, { width: 60, align: "right" });
    doc.text("TAXABLE", cols.taxable, y, { width: 62, align: "right" });
    doc.text("AMOUNT", cols.amount, y, { width: 68, align: "right" });

    y += 22;

    order.items.forEach((i, n) => {
      const gross = i.price * i.qty;
      // Line taxable value derived the same way as the order total, so the
      // column sums reconcile with the summary exactly.
      const taxable = tax.rate ? gross / (1 + tax.rate / 100) : gross;

      // Start a fresh page before the row runs off the bottom.
      if (y > doc.page.height - 190) {
        doc.addPage();
        y = 60;
      }

      doc.font("Helvetica").fontSize(8.5).fillColor(C.soft).text(String(n + 1), cols.n, y);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink)
        .text(i.title, cols.item, y, { width: 268 });

      const meta = [i.brand, i.size && `Size ${i.size}`, i.color].filter(Boolean).join("  |  ");
      const titleHeight = doc.heightOfString(i.title, { width: 268 });

      if (meta) {
        doc.font("Helvetica").fontSize(7.5).fillColor(C.muted)
          .text(meta, cols.item, y + titleHeight + 1, { width: 268 });
      }

      doc.font("Helvetica").fontSize(9).fillColor(C.ink);
      doc.text(String(i.qty), cols.qty, y, { width: 30, align: "right" });
      doc.text(rupees(i.price), cols.rate, y, { width: 60, align: "right" });
      doc.text(rupees(taxable), cols.taxable, y, { width: 62, align: "right" });
      doc.text(rupees(gross), cols.amount, y, { width: 68, align: "right" });

      const rowHeight = titleHeight + (meta ? 12 : 4) + 10;
      y += rowHeight;
      doc.moveTo(L, y - 4).lineTo(R, y - 4).lineWidth(0.5).strokeColor("#f3f2f0").stroke();
    });

    /* ── totals ── */
    y += 14;
    const tx = R - 240;
    const tw = 240;

    const totalRow = (text, value, opts = {}) => {
      doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(opts.bold ? 11 : 9)
        .fillColor(opts.accent ? C.mint : opts.bold ? C.ink : C.soft);
      doc.text(text, tx, y, { width: tw - 96 });
      doc.text(value, tx + tw - 96, y, { width: 96, align: "right" });
      y += opts.bold ? 18 : 14;
    };

    totalRow("Taxable value", rupees(tax.taxableValue ?? order.subtotal));
    if (tax.igst > 0) {
      totalRow(`IGST @ ${tax.rate}%`, rupees(tax.igst));
    } else {
      totalRow(`CGST @ ${(tax.rate ?? 0) / 2}%`, rupees(tax.cgst ?? 0));
      totalRow(`SGST @ ${(tax.rate ?? 0) / 2}%`, rupees(tax.sgst ?? 0));
    }
    if (order.discount > 0) {
      totalRow(
        `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`,
        `- ${rupees(order.discount)}`,
        { accent: true },
      );
    }
    totalRow(
      "Delivery charges",
      order.shipping === 0 ? "FREE" : rupees(order.shipping),
      { accent: order.shipping === 0 },
    );

    doc.moveTo(tx, y + 2).lineTo(R, y + 2).lineWidth(1.2).strokeColor(C.line).stroke();
    y += 10;
    totalRow("Total", rupees(order.total), { bold: true });

    /* ── footer ── */
    const fy = doc.page.height - 84;
    doc.moveTo(L, fy).lineTo(R, fy).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted)
      .text(
        "This is a computer-generated invoice and does not require a signature. " +
          `Returns accepted per the policy shown on each product. ${env.siteUrl}/help/returns`,
        L, fy + 10, { width: W },
      );

    doc.end();
  });
}

export const pdfService = { generateInvoicePdf };
