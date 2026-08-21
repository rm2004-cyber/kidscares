import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Branded transactional email.
 *
 * Every template is built here in code rather than in the Brevo dashboard, so
 * copy and design live with the codebase, get reviewed, and cannot be edited
 * out from under the app. Brevo is only the delivery pipe.
 *
 * Until BREVO_API_KEY is set, sends are logged instead of delivered — signup
 * and checkout stay testable without credentials.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const inr = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const C = {
  ink: "#17202e",
  soft: "#4a5568",
  muted: "#7c8798",
  line: "#ecebe8",
  cream: "#fffaf6",
  brand: "#f74d3f",
  brandSoft: "#fff1f0",
  mint: "#14b975",
  mintSoft: "#eefdf5",
  sun: "#ffc531",
  grape: "#7c53f5",
  sky: "#34a6e8",
};

/* Inline SVG is unreliable in Outlook/Gmail, so the logo is a hosted PNG the
   Next app already serves. Falls back to styled text via the alt attribute. */
const LOGO_URL = `${env.siteUrl}/kidscareslogo-mark.png`;

/** Confetti dots — pure table/border CSS so it survives email clients. */
const confettiBar = `
  <tr><td style="padding:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${[C.brand, C.sun, C.mint, C.sky, C.grape, C.brand, C.sun, C.mint]
        .map((c) => `<td height="6" style="background:${c};font-size:0;line-height:0">&nbsp;</td>`)
        .join("")}
    </tr></table>
  </td></tr>`;

function layout({ preheader = "", heading, body, footerNote }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif">
  <div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid ${C.line};border-radius:22px;overflow:hidden">

        ${confettiBar}

        <tr><td align="center" style="padding:26px 28px 6px">
          <img src="${LOGO_URL}" alt="KidsCares" width="180"
               style="display:block;width:180px;max-width:70%;height:auto;border:0" />
          <p style="margin:8px 0 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted}">
            Everything Kids Need, All in One Place
          </p>
        </td></tr>

        <tr><td style="padding:18px 28px 28px">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${C.ink}">${heading}</h1>
          ${body}
        </td></tr>

        <tr><td style="padding:0 28px 26px">
          <div style="border-top:1px solid ${C.line};padding-top:16px">
            <p style="margin:0 0 6px;font-size:11px;line-height:1.6;color:${C.muted}">
              ${footerNote ?? "Questions? Reply to this email or write to care@kidscares.example — we answer within one working day."}
            </p>
            <p style="margin:0;font-size:11px;color:${C.muted}">
              KidsCares Retail Pvt Ltd · Mohali, Punjab ·
              <a href="${env.siteUrl}" style="color:${C.brand};text-decoration:none">kidscares.in</a>
            </p>
          </div>
        </td></tr>

        ${confettiBar}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr><td style="background:${C.brand};border-radius:999px">
      <a href="${href}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">${label}</a>
    </td></tr>
  </table>`;

/** Two-column money row used by every summary block. */
const row = (label, value, opts = {}) => `
  <tr>
    <td style="padding:5px 0;font-size:13px;color:${opts.strong ? C.ink : C.soft};${opts.strong ? "font-weight:700" : ""}">${label}</td>
    <td align="right" style="padding:5px 0;font-size:13px;color:${opts.accent ? C.mint : C.ink};font-weight:${opts.strong ? 800 : 600}">${value}</td>
  </tr>`;

/* ───────────────────────────── transport ──────────────────────────────── */

async function deliver({ to, subject, html, text }) {
  if (!env.brevo.enabled) {
    logger.warn(`[mailer] Brevo not configured — would send "${subject}" to ${to}`);
    return { delivered: false, simulated: true };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": env.brevo.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.brevo.senderEmail, name: env.brevo.senderName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error(`[mailer] Brevo ${res.status}: ${detail}`);
      return { delivered: false, error: `Brevo responded ${res.status}` };
    }

    const json = await res.json().catch(() => ({}));
    logger.success(`[mailer] sent "${subject}" → ${to}`);
    return { delivered: true, messageId: json.messageId };
  } catch (err) {
    // Email is never allowed to fail the operation that triggered it.
    logger.error("[mailer] send failed:", err.message);
    return { delivered: false, error: err.message };
  }
}

/* ─────────────────────────────── OTP ──────────────────────────────────── */

export function sendOtpEmail({ to, code, purpose, minutes }) {
  const reason =
    purpose === "signup" ? "finish creating your KidsCares account"
    : purpose === "reset" ? "reset your password"
    : "sign in to KidsCares";

  const digits = String(code)
    .split("")
    .map(
      (d) => `<td style="padding:0 3px">
        <div style="width:40px;height:52px;line-height:52px;text-align:center;background:${C.brandSoft};border:2px dashed #ffc4bf;border-radius:12px;font-size:24px;font-weight:800;color:${C.ink}">${d}</div>
      </td>`,
    )
    .join("");

  return deliver({
    to,
    subject: `${code} is your KidsCares verification code`,
    text: `Your KidsCares code is ${code}. It expires in ${minutes} minutes. Never share it with anyone.`,
    html: layout({
      preheader: `${code} — expires in ${minutes} minutes`,
      heading: "Here's your verification code",
      body: `
        <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:${C.soft}">
          Use the code below to ${reason}.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto">
          <tr>${digits}</tr>
        </table>
        <p style="margin:0;text-align:center;font-size:12px;color:${C.muted}">
          Expires in <b style="color:${C.ink}">${minutes} minutes</b>
        </p>
        <div style="margin:22px 0 0;padding:12px 14px;background:${C.cream};border-radius:12px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
            <b style="color:${C.ink}">Keep this private.</b> KidsCares will never call or
            message you asking for this code. If you did not request it, you can ignore this email.
          </p>
        </div>`,
    }),
  });
}

/* ───────────────────────── order confirmation ─────────────────────────── */

function itemRows(items) {
  return items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line}">
          <p style="margin:0;font-size:13px;font-weight:700;color:${C.ink}">${i.title}</p>
          <p style="margin:2px 0 0;font-size:11px;color:${C.muted}">
            ${[i.brand, i.size && `Size ${i.size}`, i.color, `Qty ${i.qty}`].filter(Boolean).join(" · ")}
          </p>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:13px;font-weight:700;color:${C.ink};white-space:nowrap">
          ${inr(i.price * i.qty)}
        </td>
      </tr>`,
    )
    .join("");
}

/**
 * Billing block. Prices are GST-inclusive, so the tax is broken back out of
 * the taxable value rather than added on top — that is what a compliant
 * invoice for an inclusive-priced sale has to show.
 */
function billingRows(order) {
  const tax = order.tax ?? {};
  const lines = [
    row("Taxable value", inr(tax.taxableValue ?? order.subtotal)),
  ];

  if (tax.igst > 0) {
    lines.push(row(`IGST @ ${tax.rate}%`, inr(tax.igst)));
  } else {
    lines.push(row(`CGST @ ${(tax.rate ?? 0) / 2}%`, inr(tax.cgst ?? 0)));
    lines.push(row(`SGST @ ${(tax.rate ?? 0) / 2}%`, inr(tax.sgst ?? 0)));
  }

  if (order.discount > 0) {
    lines.push(
      row(
        `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`,
        `− ${inr(order.discount)}`,
        { accent: true },
      ),
    );
  }

  lines.push(
    row(
      "Delivery charges",
      order.shipping === 0 ? "FREE" : inr(order.shipping),
      { accent: order.shipping === 0 },
    ),
  );

  return lines.join("");
}

export function sendOrderConfirmationEmail({ to, order, customerName }) {
  const eta = order.eta
    ? new Date(order.eta).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  const a = order.address ?? {};

  return deliver({
    to,
    subject: `Order ${order.orderNo} confirmed — thank you!`,
    text: `Thanks ${customerName ?? ""}! Order ${order.orderNo} is confirmed. Total ${inr(order.total)}.`,
    html: layout({
      preheader: `Order ${order.orderNo} confirmed · ${inr(order.total)}`,
      heading: `Thank you${customerName ? `, ${customerName.split(" ")[0]}` : ""}!`,
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          Your order is confirmed and we are getting it ready. We will email you again
          the moment it ships.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.mintSoft};border:1px solid #aef3d2;border-radius:14px;margin:0 0 20px">
          <tr><td style="padding:14px 16px">
            <p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.mint}">Order number</p>
            <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:${C.ink}">${order.orderNo}</p>
            ${eta ? `<p style="margin:8px 0 0;font-size:12px;color:${C.soft}">Arriving by <b style="color:${C.ink}">${eta}</b></p>` : ""}
          </td></tr>
        </table>

        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted}">
          Items (${order.items.length})
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemRows(order.items)}
        </table>

        <p style="margin:22px 0 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted}">
          Billing summary
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${billingRows(order)}
          <tr><td colspan="2" style="padding-top:8px;border-top:2px solid ${C.line}"></td></tr>
          ${row("Total paid", inr(order.total), { strong: true })}
        </table>

        <p style="margin:10px 0 0;font-size:11px;color:${C.muted}">
          ${order.payment?.method === "cod"
            ? "Payable on delivery in cash. Please keep the exact amount ready."
            : "Paid online. This email is your receipt."}
          All prices are inclusive of GST.
        </p>

        <p style="margin:22px 0 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted}">
          Delivering to
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
          <b style="color:${C.ink}">${a.fullName ?? ""}</b><br/>
          ${[a.line1, a.line2].filter(Boolean).join(", ")}<br/>
          ${a.city ?? ""}, ${a.state ?? ""} — ${a.pincode ?? ""}<br/>
          ${a.phone ?? ""}
        </p>

        ${button(`${env.siteUrl}/account/orders`, "Track your order")}`,
    }),
  });
}

/* ──────────────────────────── order shipped ───────────────────────────── */

export function sendOrderShippedEmail({ to, order, tracking }) {
  return deliver({
    to,
    subject: `Order ${order.orderNo} has shipped`,
    text: `Order ${order.orderNo} shipped via ${tracking?.courier ?? "our courier partner"}. AWB ${tracking?.awb ?? "-"}.`,
    html: layout({
      preheader: `On its way — AWB ${tracking?.awb ?? ""}`,
      heading: "Your order is on its way",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          Order <b style="color:${C.ink}">${order.orderNo}</b> has left our warehouse.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.cream};border:1px solid ${C.line};border-radius:14px">
          <tr><td style="padding:14px 16px">
            ${row("Courier", tracking?.courier ?? "—")}
            ${row("Tracking number", tracking?.awb ?? "—")}
            ${tracking?.etaText ? row("Expected delivery", tracking.etaText) : ""}
          </td></tr>
        </table>

        ${button(tracking?.trackingUrl || `${env.siteUrl}/account/orders`, "Track shipment")}

        <p style="margin:0;font-size:11px;color:${C.muted}">
          Tracking can take a few hours to show its first scan after pickup.
        </p>`,
    }),
  });
}

/* ─────────────────────────── order cancelled ──────────────────────────── */

export function sendOrderCancelledEmail({ to, order, reason, refund }) {
  const refundBlock = refund?.amount
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:${C.mintSoft};border:1px solid #aef3d2;border-radius:14px;margin:16px 0">
         <tr><td style="padding:14px 16px">
           <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${C.mint}">Refund initiated</p>
           <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
             <b style="color:${C.ink}">${inr(refund.amount)}</b> is on its way back to your
             original payment method. Banks usually take <b style="color:${C.ink}">5–7 working days</b>
             to post it.${refund.reference ? `<br/>Reference: ${refund.reference}` : ""}
           </p>
         </td></tr>
       </table>`
    : order.payment?.method === "cod"
      ? `<p style="margin:16px 0;font-size:13px;line-height:1.6;color:${C.soft}">
           Nothing was charged — this was a cash-on-delivery order, so there is no refund to process.
         </p>`
      : "";

  return deliver({
    to,
    subject: `Order ${order.orderNo} cancelled`,
    text: `Order ${order.orderNo} has been cancelled.${refund?.amount ? ` Refund of ${inr(refund.amount)} initiated.` : ""}`,
    html: layout({
      preheader: `Order ${order.orderNo} cancelled`,
      heading: "Your order has been cancelled",
      body: `
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${C.soft}">
          We have cancelled order <b style="color:${C.ink}">${order.orderNo}</b> as requested.
        </p>

        ${reason ? `<p style="margin:0 0 4px;font-size:12px;color:${C.muted}">Reason you gave</p>
          <p style="margin:0 0 8px;padding:10px 12px;background:${C.cream};border-radius:10px;font-size:13px;color:${C.ink}">${reason}</p>` : ""}

        ${refundBlock}

        <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${C.soft}">
          Changed your mind? Everything is still on the site.
        </p>
        ${button(env.siteUrl, "Continue shopping")}`,
      footerNote:
        "If you did not request this cancellation, contact us immediately at care@kidscares.example.",
    }),
  });
}

/* ────────────────────────── refund processed ──────────────────────────── */

export function sendRefundProcessedEmail({ to, order, amount, reference }) {
  return deliver({
    to,
    subject: `Refund of ${inr(amount)} processed for ${order.orderNo}`,
    text: `Refund of ${inr(amount)} for order ${order.orderNo} has been processed. Reference ${reference ?? "-"}.`,
    html: layout({
      preheader: `${inr(amount)} refunded`,
      heading: "Your refund is on its way",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          We have processed a refund for order <b style="color:${C.ink}">${order.orderNo}</b>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.mintSoft};border:1px solid #aef3d2;border-radius:14px">
          <tr><td style="padding:16px">
            ${row("Refund amount", inr(amount), { strong: true })}
            ${reference ? row("Reference", reference) : ""}
            ${row("Expected in", "5–7 working days")}
          </td></tr>
        </table>
        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${C.muted}">
          The exact posting date depends on your bank. If it has not appeared after
          7 working days, reply to this email with the reference above.
        </p>`,
    }),
  });
}

export const mailer = {
  deliver,
  sendOtpEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderCancelledEmail,
  sendRefundProcessedEmail,
};

export default mailer;
