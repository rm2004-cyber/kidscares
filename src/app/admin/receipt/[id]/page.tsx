import type { Metadata } from "next";
import { ReceiptSlip } from "./ReceiptSlip";

export const metadata: Metadata = {
  title: "Packing slip",
  robots: { index: false, follow: false },
};

/**
 * Thermal packing slip.
 *
 * Deliberately outside `admin/(shell)` — the sidebar, topbar and page chrome
 * would all land on the paper. This route renders the slip alone at 80mm and
 * nothing else.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReceiptSlip id={id} />;
}
