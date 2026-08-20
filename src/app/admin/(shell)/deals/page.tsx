import { DealsView } from "./DealsView";
import { getDeals } from "@/lib/data";

export const metadata = { title: "Deals & Countdown" };

export default async function AdminDealsPage() {
  const deals = await getDeals();
  return <DealsView deals={deals} />;
}
