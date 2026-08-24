import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Branded transactional email.
 *
 * Every template is built here in code rather than in the Brevo dashboard, so
 * copy and design live with the codebase, get reviewed, and cannot be edited
 * out from under the app. Brevo is only the delivery pipe, reached over its
 * SMTP relay (the v3 REST API rejects SMTP keys with 401 "Key not found").
 *
 * Until BREVO_SMTP_USER/BREVO_SMTP_KEY are set, sends are logged instead of
 * delivered — signup and checkout stay testable without credentials.
 */

const transporter = nodemailer.createTransport({
  host: env.brevo.smtpHost,
  port: env.brevo.smtpPort,
  secure: false, // STARTTLS on 587
  auth: {
    user: env.brevo.smtpUser,
    pass: env.brevo.smtpKey,
  },
});

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

/* Logo strategy: prefer a public HTTPS URL (EMAIL_LOGO_URL) — Gmail's proxy
   can fetch it and no attachment chip appears in the mailbox list. Without
   one, the logo travels inside the mail as a cid-referenced attachment,
   since a localhost/LAN URL would just render as broken image. */
const LOGO_CID = "kidscares-logo";
const here = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(here, "../../../public/kidscareslogo-mark.png");
const hasLogoFile = fs.existsSync(LOGO_PATH);
const LOGO_SRC = env.brevo.logoUrl || (hasLogoFile ? `cid:${LOGO_CID}` : "");
const LOGO_ATTACHMENT =
  !env.brevo.logoUrl && hasLogoFile
    ? [
        {
          filename: "kidscares-logo.png",
          path: LOGO_PATH,
          cid: LOGO_CID,
          /* Without this, clients list the logo under the paperclip icon in the
             mailbox view; "inline" marks it as part of the body instead. */
          contentDisposition: "inline",
        },
      ]
    : [];

/**
 * The storefront's kiddish backdrop, baked to a tiling PNG.
 *
 * The site draws it as an inline data-URI SVG, which Gmail strips and Outlook
 * cannot parse — so `scripts/build-email-backdrop.mjs` rasterises the default
 * surface from `lib/theme/surfaces.ts` and hosts it on Cloudinary instead.
 * The cream ground is baked into the PNG rather than layered under it, because
 * a transparent tile over a bgcolor renders grey in Outlook. Every email wears
 * this same neutral theme regardless of what was ordered.
 */
const BACKDROP_URL = env.cloudinary.cloudName
  ? `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/kidscares/email-backdrops/default.png`
  : `${env.siteUrl}/email/backdrop-default.png`;

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
<body style="margin:0;padding:0;background-color:${C.cream};background-image:url('${BACKDROP_URL}');background-repeat:repeat;font-family:'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif">
  <div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         background="${BACKDROP_URL}" bgcolor="${C.cream}"
         style="background-color:${C.cream};background-image:url('${BACKDROP_URL}');background-repeat:repeat">
    <tr><td align="center" style="padding:28px 12px">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
              style="width:100%;position:absolute;top:0;left:0;z-index:-1">
        <v:fill type="tile" src="${BACKDROP_URL}" color="${C.cream}" />
      </v:rect>
      <![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid ${C.line};border-radius:22px;overflow:hidden">

        ${confettiBar}

        <tr><td align="center" style="padding:26px 28px 6px">
          ${LOGO_SRC ? `<img src="${LOGO_SRC}" alt="KidsCares" width="180"
               style="display:block;width:180px;max-width:70%;height:auto;border:0" />` : ""}
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

async function deliver({ to, subject, html, text, attachments }) {
  if (!env.brevo.enabled) {
    logger.warn(
      `[mailer] Brevo not configured — would send "${subject}" to ${to}` +
        (attachments?.length ? ` with ${attachments.length} attachment(s)` : ""),
    );
    /* html rides along so tests and preview tooling can render the email
       without depending on the transport's outcome. */
    return { delivered: false, simulated: true, html };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${env.brevo.senderName}" <${env.brevo.senderEmail}>`,
      to,
      subject,
      html,
      text,
      /* Invoice PDFs arrive as { name, content(Buffer) } and ride as real
         attachments; the logo is appended as an inline cid reference so it
         renders in-body without adding to the paperclip count. */
      attachments: [
        ...(attachments ?? []).map((a) => ({
          filename: a.name,
          content: a.content,
        })),
        ...LOGO_ATTACHMENT,
      ],
    });

    logger.success(`[mailer] sent "${subject}" → ${to}`);
    return { delivered: true, messageId: info.messageId, html };
  } catch (err) {
    // Email is never allowed to fail the operation that triggered it.
    logger.error("[mailer] send failed:", err.message);
    return { delivered: false, error: err.message, html };
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

export function sendOrderConfirmationEmail({ to, order, customerName, invoicePdf }) {
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
    /* The invoice rides along with the confirmation so the customer has it
       immediately, without hunting for a download link. */
    attachments: invoicePdf
      ? [{ name: `invoice-${order.orderNo}.pdf`, content: invoicePdf }]
      : undefined,
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

        ${button(`${env.siteUrl}/account/orders`, "Track your order")}

        <p style="margin:0;font-size:11px;color:${C.muted}">
          Your tax invoice is attached to this email as a PDF.
        </p>`,
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
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Courier", tracking?.courier ?? "—")}
              ${row("Tracking number", tracking?.awb ?? "—")}
              ${tracking?.etaText ? row("Expected delivery", tracking.etaText) : ""}
            </table>
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

/**
 * Sent the moment a refund is triggered — not when it lands.
 *
 * Customers chase refunds because nobody told them it started. Naming the
 * amount, the withheld part and the expected window up front is what stops
 * that. A second email follows when the bank confirms.
 */
export function sendRefundInitiatedEmail({
  to,
  order,
  request,
  amount,
  withheld = 0,
  deductionNote = "",
  instant = false,
}) {
  return deliver({
    to,
    subject: `Refund of ${inr(amount)} started for ${order.orderNo}`,
    text:
      `Your refund of ${inr(amount)} for order ${order.orderNo} has been started.` +
      (withheld > 0 ? ` ${inr(withheld)} was withheld: ${deductionNote}` : ""),
    html: layout({
      preheader: `${inr(amount)} on its way back`,
      heading: "Your refund is on its way",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          We have your returned items and started the refund for
          <b style="color:${C.ink}">${order.orderNo}</b>. It goes back to the
          same method you paid with — nothing more for you to do.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;margin-bottom:16px">
          <tr><td style="padding:14px 16px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Returned items", inr(request.refundAmount))}
              ${withheld > 0 ? row("Withheld", `− ${inr(withheld)}`) : ""}
              <tr><td colspan="2" style="padding-top:8px;border-top:1px solid ${C.line}"></td></tr>
              <tr>
                <td style="padding-top:8px;font-size:14px;font-weight:800;color:${C.ink}">
                  Refund amount
                </td>
                <td align="right" style="padding-top:8px;font-size:16px;font-weight:800;color:${C.brand}">
                  ${inr(amount)}
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        ${
          withheld > 0
            ? `<div style="padding:12px 14px;background:${C.brandSoft};border-radius:12px;margin-bottom:16px">
                 <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
                   <b style="color:${C.ink}">Why ${inr(withheld)} was withheld:</b><br/>
                   ${deductionNote}
                 </p>
               </div>`
            : ""
        }

        <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
          ${
            instant
              ? "Your bank has already settled this one — check your statement."
              : "Banks usually take 5–7 working days to show it. We will email you again the moment it clears."
          }
        </p>`,
    }),
  });
}

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
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Refund amount", inr(amount), { strong: true })}
              ${reference ? row("Reference", reference) : ""}
              ${row("Expected in", "5–7 working days")}
            </table>
          </td></tr>
        </table>
        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${C.muted}">
          The exact posting date depends on your bank. If it has not appeared after
          7 working days, reply to this email with the reference above.
        </p>`,
    }),
  });
}

/* ───────────────────────────── delivered ──────────────────────────────── */

export function sendOrderDeliveredEmail({ to, order, customerName }) {
  const returnable = (order.items ?? []).filter((i) => i.isReturnable);
  const window = returnable[0]?.returnWindowDays ?? 0;

  return deliver({
    to,
    subject: `Order ${order.orderNo} delivered`,
    text: `Order ${order.orderNo} has been delivered. Enjoy!`,
    html: layout({
      preheader: `${order.orderNo} delivered`,
      heading: `It's here${customerName ? `, ${customerName.split(" ")[0]}` : ""}!`,
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          Order <b style="color:${C.ink}">${order.orderNo}</b> has been delivered.
          We hope it is a hit.
        </p>

        ${returnable.length
          ? `<div style="margin:0 0 18px;padding:14px 16px;background:${C.cream};border-radius:14px">
               <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
                 Not quite right? ${returnable.length === order.items.length ? "This order" : `${returnable.length} of these items`}
                 can be returned within <b style="color:${C.ink}">${window} days</b> — free pickup, refund to source.
               </p>
             </div>`
          : `<div style="margin:0 0 18px;padding:14px 16px;background:${C.cream};border-radius:14px">
               <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
                 For hygiene reasons the items in this order cannot be returned.
                 If something arrived damaged, reply to this email and we will sort it out.
               </p>
             </div>`}

        <p style="margin:0 0 4px;font-size:14px;color:${C.soft}">
          Enjoyed it? A quick review helps other parents choose.
        </p>
        ${button(`${env.siteUrl}/account/orders`, "Rate your order")}`,
    }),
  });
}

/* ─────────────────────── shipment booked / in flight ───────────────────── */

/**
 * Sent when a courier is booked — before anyone has collected the parcel.
 *
 * Says "booked", never "shipped": the difference matters to someone watching
 * their tracking, and overstating it once costs more trust than it buys.
 */
export function sendShipmentBookedEmail({ to, order, shipment }) {
  return deliver({
    to,
    subject: `Order ${order.orderNo} is booked for shipping`,
    text: `Your order ${order.orderNo} is booked with ${shipment.courierName ?? "a courier"}. Tracking number ${shipment.awb}.`,
    html: layout({
      preheader: `${shipment.courierName ?? "Courier"} · ${shipment.awb}`,
      heading: "Your order is booked for shipping",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          <b style="color:${C.ink}">${order.orderNo}</b> is packed and booked with
          a courier. We will email you again the moment they collect it.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;margin-bottom:16px">
          <tr><td style="padding:14px 16px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Courier", shipment.courierName ?? "Assigned")}
              ${row("Tracking number", shipment.awb ?? "—")}
              ${shipment.estimatedDays ? row("Estimated delivery", `${shipment.estimatedDays} day(s)`) : ""}
            </table>
          </td></tr>
        </table>

        ${button(`${env.siteUrl}/orders/${order.orderNo}/track`, "Track this order")}

        <p style="margin:0;font-size:11px;color:${C.muted}">
          Tracking usually shows its first scan once the courier has collected
          the parcel.
        </p>`,
    }),
  });
}

export function sendOutForDeliveryEmail({ to, order, tracking }) {
  return deliver({
    to,
    subject: `Out for delivery — ${order.orderNo}`,
    text: `Your order ${order.orderNo} is out for delivery today.`,
    html: layout({
      preheader: "Arriving today",
      heading: "Out for delivery today",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          <b style="color:${C.ink}">${order.orderNo}</b> is on the van and should
          reach you today.
        </p>

        ${
          order.payment?.method === "cod"
            ? `<div style="padding:12px 14px;background:${C.brandSoft};border-radius:12px;margin-bottom:16px">
                 <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
                   <b style="color:${C.ink}">Please keep ${inr(order.total)} ready</b> —
                   this order is cash on delivery.
                 </p>
               </div>`
            : ""
        }

        ${button(`${env.siteUrl}/orders/${order.orderNo}/track`, "Track this order")}

        <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
          ${tracking?.courier ?? "The courier"} may call you on the number on the
          order, so keep your phone nearby.
        </p>`,
    }),
  });
}

/**
 * A failed attempt needs a message, not silence: it is almost always something
 * the customer can fix, and a parcel goes back to the seller after a few
 * unanswered attempts.
 */
export function sendDeliveryFailedEmail({ to, order, tracking }) {
  return deliver({
    to,
    subject: `We could not deliver ${order.orderNo}`,
    text: `A delivery attempt for ${order.orderNo} did not succeed. The courier will try again.`,
    html: layout({
      preheader: "The courier will try again",
      heading: "We could not deliver your order",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          ${tracking?.courier ?? "The courier"} tried to deliver
          <b style="color:${C.ink}">${order.orderNo}</b> and could not complete it.
          They will attempt again on the next working day.
        </p>

        <div style="padding:12px 14px;background:${C.brandSoft};border-radius:12px;margin-bottom:16px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
            <b style="color:${C.ink}">This usually helps:</b> keep the phone on the
            order reachable, and let us know if the address needs a landmark.
            After a few failed attempts the parcel is sent back to us.
          </p>
        </div>

        ${button(`${env.siteUrl}/orders/${order.orderNo}/track`, "Track this order")}

        <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
          Need to change something? Reply to this email and we will sort it out.
        </p>`,
    }),
  });
}

/* ───────────────────────── return approved ────────────────────────────── */

export function sendReturnApprovedEmail({ to, order, request, pickup }) {
  const a = order.address ?? {};

  return deliver({
    to,
    subject: `Return approved — pickup arranged for ${order.orderNo}`,
    text: `Your return for ${order.orderNo} is approved. ${pickup?.courier ?? "A courier"} will collect it.`,
    html: layout({
      preheader: `Pickup arranged${pickup?.courier ? ` via ${pickup.courier}` : ""}`,
      heading: "Return approved — we are collecting it",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          Good news — your return for <b style="color:${C.ink}">${order.orderNo}</b>
          is approved and a free pickup has been arranged.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;margin-bottom:16px">
          <tr><td style="padding:14px 16px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Courier", pickup?.courier ?? "Assigned shortly")}
              ${pickup?.awb ? row("Tracking number", pickup.awb) : ""}
              ${pickup?.estimatedDays ? row("Expected pickup", `${pickup.estimatedDays} day(s)`) : ""}
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted}">
          Collecting from
        </p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${C.soft}">
          <b style="color:${C.ink}">${a.fullName ?? ""}</b><br/>
          ${[a.line1, a.line2].filter(Boolean).join(", ")}<br/>
          ${a.city ?? ""}, ${a.state ?? ""} — ${a.pincode ?? ""}<br/>
          ${a.phone ?? ""}
        </p>

        <div style="padding:12px 14px;background:${C.brandSoft};border-radius:12px">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${C.soft}">
            <b style="color:${C.ink}">Before pickup:</b> keep the item in its original
            packaging with tags attached, and hand it to the courier unsealed so they
            can verify the contents.
          </p>
        </div>

        <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${C.soft}">
          Your refund of <b style="color:${C.ink}">${inr(request.refundAmount)}</b> is
          issued once the parcel reaches our warehouse.
        </p>`,
    }),
  });
}

/* ──────────────────────── return completed ────────────────────────────── */

export function sendReturnCompletedEmail({ to, order, request, refund }) {
  const rows = (request.items ?? [])
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;font-size:13px;color:${C.ink}">${i.title} × ${i.qty}</td>
        <td style="padding:6px 0;font-size:13px;text-align:right;color:${C.ink}">${inr(i.price * i.qty)}</td>
      </tr>`,
    )
    .join("");

  return deliver({
    to,
    subject: `Return completed for ${order.orderNo}`,
    text: `Your return for ${order.orderNo} is complete.${refund?.amount ? ` Refund of ${inr(refund.amount)} initiated.` : ""}`,
    html: layout({
      preheader: `Return completed${refund?.amount ? ` · ${inr(refund.amount)} refunded` : ""}`,
      heading: "Your return is complete",
      body: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.soft}">
          We have received the items from order
          <b style="color:${C.ink}">${order.orderNo}</b> and checked them in.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};margin-bottom:16px">
          ${rows}
        </table>

        ${refund?.amount
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="background:${C.mintSoft};border:1px solid #aef3d2;border-radius:14px">
               <tr><td style="padding:14px 16px">
                 <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${C.mint}">Refund initiated</p>
                 <p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
                   <b style="color:${C.ink}">${inr(refund.amount)}</b> is on its way back to your
                   original payment method — usually <b style="color:${C.ink}">5–7 working days</b>.
                   ${refund.reference ? `<br/>Reference: ${refund.reference}` : ""}
                 </p>
               </td></tr>
             </table>`
          : `<p style="margin:0;font-size:13px;line-height:1.6;color:${C.soft}">
               This was a cash-on-delivery order, so there is no online refund to process.
               Our team will be in touch about the amount.
             </p>`}`,
    }),
  });
}

export const mailer = {
  deliver,
  sendOtpEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendShipmentBookedEmail,
  sendOutForDeliveryEmail,
  sendDeliveryFailedEmail,
  sendOrderCancelledEmail,
  sendOrderDeliveredEmail,
  sendReturnApprovedEmail,
  sendReturnCompletedEmail,
  sendRefundInitiatedEmail,
  sendRefundProcessedEmail,
};

export default mailer;
