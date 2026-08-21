"use client";

import { useCallback, useEffect, useState } from "react";
import { paymentApi } from "@/utils/service";

/**
 * Razorpay Checkout.
 *
 * The script is loaded on demand rather than in the root layout — it is ~90KB
 * and only a fraction of visitors reach payment, so every other page would pay
 * for it needlessly.
 *
 * Nothing the browser reports is trusted: the widget's success callback is
 * relayed to the API, which re-derives the HMAC server-side before marking the
 * order paid.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type RazorpayResult =
  | { ok: true; orderNo: string }
  | { ok: false; reason: "dismissed" | "failed" | "unavailable"; message?: string };

export function useRazorpay() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Warm the script once the checkout screen mounts, so the tap that opens
    // the widget does not wait on a network round trip.
    void loadScript().then(setReady);
  }, []);

  const pay = useCallback(
    async ({
      orderId,
      user,
    }: {
      orderId: string;
      user: { name?: string; email?: string; phone?: string } | null;
    }): Promise<RazorpayResult> => {
      const loaded = await loadScript();
      if (!loaded || !window.Razorpay) {
        return { ok: false, reason: "unavailable", message: "Could not load the payment window." };
      }

      let session;
      try {
        session = await paymentApi.createOrder(orderId);
      } catch (err) {
        return {
          ok: false,
          reason: "failed",
          message: err instanceof Error ? err.message : "Could not start payment.",
        };
      }

      return new Promise<RazorpayResult>((resolve) => {
        const rzp = new window.Razorpay!({
          key: session.keyId,
          amount: session.amountInPaise,
          currency: session.currency,
          name: "KidsCares",
          description: `Order ${session.orderNo}`,
          image: `${window.location.origin}/kidscareslogo-mark.png`,
          order_id: session.razorpayOrderId,
          prefill: {
            name: user?.name ?? "",
            email: user?.email ?? "",
            contact: user?.phone ?? "",
          },
          theme: { color: "#f74d3f" },

          handler: async (response: Record<string, string>) => {
            try {
              await paymentApi.verify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              resolve({ ok: true, orderNo: session.orderNo });
            } catch (err) {
              resolve({
                ok: false,
                reason: "failed",
                message:
                  err instanceof Error
                    ? err.message
                    : "Payment went through but we could not confirm it. Contact support.",
              });
            }
          },

          modal: {
            // Closing the widget is not a failure — the order still exists and
            // can be paid from Your Orders.
            ondismiss: () => resolve({ ok: false, reason: "dismissed" }),
          },
        });

        rzp.open();
      });
    },
    [],
  );

  return { ready, pay };
}
