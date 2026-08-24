"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Printer } from "lucide-react";

import { adminApi, ApiError } from "@/utils/service";

type Receipt = {
  orderNo: string;
  placedAt: string;
  store: { name: string; phone: string; email: string };
  warehouse: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  customer: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: {
    title: string;
    size?: string;
    color?: string;
    qty: number;
    price: number;
    lineTotal: number;
  }[];
  itemCount: number;
  total: number;
  payment: { method: string; status: string; amountDue: number };
  shipping: { awb?: string; courier?: string };
};

/* Thermal printers have no colour and a narrow roll, so the slip is plain
   text on 80mm — no logo image, no rules thinner than a printhead dot. */
const PAPER_MM = 80;
const PAD_MM = 4;

const money = (n: number) => `Rs.${Number(n).toLocaleString("en-IN")}`;

const PAY_LABEL: Record<string, string> = {
  cod: "CASH ON DELIVERY",
  upi: "UPI - PAID",
  card: "CARD - PAID",
};

export function ReceiptSlip({ id }: { id: string }) {
  const [data, setData] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .orderReceipt(id)
      .then((d) => setData(d as Receipt))
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Could not load this order.",
        ),
      );
  }, [id]);

  /* Print once the slip is on screen. Without the frame delay the dialog can
     open against a half-laid-out page and clip the last line. */
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [data]);

  if (error) {
    return (
      <p className="slip-msg" role="alert">
        <AlertCircle size={16} />
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="slip-msg">
        <Loader2 size={16} className="spin" />
        Loading slip…
      </p>
    );
  }

  const addr = (a: Receipt["customer"] | Receipt["warehouse"]) =>
    [a.line1, a.line2, `${a.city}, ${a.state} - ${a.pincode}`]
      .filter(Boolean)
      .join("\n");

  const cod = data.payment.amountDue > 0;

  return (
    <>
      <style>{css}</style>

      <button className="print-btn" onClick={() => window.print()}>
        <Printer size={15} />
        Print slip
      </button>

      <div className="slip">
        <div className="center">
          <div className="brand">{data.store.name}</div>
          <div className="sub">{data.store.phone}</div>
        </div>

        <div className="rule" />

        <div className="row">
          <span className="b">ORDER</span>
          <span className="b">{data.orderNo}</span>
        </div>
        <div className="row">
          <span>Date</span>
          <span>
            {new Date(data.placedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {data.shipping.awb && (
          <div className="row">
            <span>AWB</span>
            <span>{data.shipping.awb}</span>
          </div>
        )}

        <div className="rule" />

        <div className="label">FROM</div>
        <div className="b">{data.warehouse.name}</div>
        <pre className="addr">{addr(data.warehouse)}</pre>
        {data.warehouse.phone && <div>Ph {data.warehouse.phone}</div>}

        <div className="gap" />

        <div className="label">DELIVER TO</div>
        <div className="b big">{data.customer.name}</div>
        <pre className="addr">{addr(data.customer)}</pre>
        {data.customer.phone && <div className="b">Ph {data.customer.phone}</div>}

        <div className="rule" />

        <table className="items">
          <thead>
            <tr>
              <th className="l">ITEM</th>
              <th className="c">QTY</th>
              <th className="r">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i}>
                <td className="l">
                  {it.title}
                  {(it.size || it.color) && (
                    <div className="variant">
                      {[it.size, it.color].filter(Boolean).join(" / ")}
                    </div>
                  )}
                </td>
                <td className="c">{it.qty}</td>
                <td className="r">{money(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rule" />

        <div className="row">
          <span>Items</span>
          <span>{data.itemCount}</span>
        </div>
        <div className="row total">
          <span>TOTAL</span>
          <span>{money(data.total)}</span>
        </div>

        <div className="rule" />

        <div className="center pay">
          {PAY_LABEL[data.payment.method] ?? data.payment.method.toUpperCase()}
        </div>
        {cod ? (
          <div className="center due">COLLECT {money(data.payment.amountDue)}</div>
        ) : (
          <div className="center sub">No amount due on delivery</div>
        )}

        <div className="rule" />

        <div className="center sub foot">
          Thank you for shopping with {data.store.name}
          <br />
          {data.store.email}
        </div>
      </div>
    </>
  );
}

/* Plain CSS, not Tailwind: this page is printed, not themed, and the print
   rules need exact millimetre control that utility classes cannot express. */
const css = `
  :root { color-scheme: light; }
  body { background: #f4f4f5; margin: 0; }

  .slip {
    width: ${PAPER_MM}mm;
    box-sizing: border-box;
    padding: ${PAD_MM}mm;
    margin: 12px auto;
    background: #fff;
    color: #000;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.35;
  }

  .center { text-align: center; }
  .b { font-weight: 700; }
  .big { font-size: 13px; }
  .sub { font-size: 10px; }
  .gap { height: 6px; }

  .brand { font-size: 17px; font-weight: 700; letter-spacing: 1px; }

  .rule { border-top: 1px dashed #000; margin: 6px 0; }

  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row.total { font-size: 15px; font-weight: 700; margin-top: 2px; }

  .label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 1px;
  }

  /* Addresses keep their line breaks, and long street names must wrap rather
     than run off the 80mm roll. */
  .addr {
    margin: 0;
    font: inherit;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .items { width: 100%; border-collapse: collapse; }
  .items th {
    font-size: 9px;
    letter-spacing: .5px;
    border-bottom: 1px solid #000;
    padding-bottom: 2px;
  }
  .items td { padding: 3px 0; vertical-align: top; }
  .l { text-align: left; }
  .c { text-align: center; width: 26px; }
  .r { text-align: right; white-space: nowrap; }
  .variant { font-size: 9px; }

  .pay { font-size: 12px; font-weight: 700; letter-spacing: .5px; }
  .due {
    font-size: 15px;
    font-weight: 700;
    border: 2px solid #000;
    padding: 3px 0;
    margin-top: 4px;
  }
  .foot { margin-top: 6px; }

  .print-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 0;
    border-radius: 10px;
    background: #17202e;
    color: #fff;
    font: 600 13px/1 system-ui, sans-serif;
    cursor: pointer;
  }

  .slip-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    padding: 40px;
    font: 500 14px/1 system-ui, sans-serif;
  }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media print {
    /* Roll paper: fixed width, and the height grows with the content so the
       printer cuts right after the last line instead of feeding a blank page. */
    @page { size: ${PAPER_MM}mm auto; margin: 0; }
    body { background: #fff; }
    .slip { margin: 0; width: auto; }
    .print-btn { display: none; }
  }
`;
