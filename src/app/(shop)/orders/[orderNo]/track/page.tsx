import type { Metadata } from "next";
import { TrackView } from "./TrackView";

export const metadata: Metadata = {
  title: "Track your order",
  /* An order number in a URL is not a secret worth indexing. */
  robots: { index: false, follow: false },
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  return <TrackView orderNo={orderNo} />;
}
