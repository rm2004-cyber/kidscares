import { BannersView } from "./BannersView";
import { getBanners } from "@/lib/data";

export const metadata = { title: "Advertisements" };

export default async function AdminBannersPage() {
  const banners = await getBanners();
  return <BannersView banners={banners} />;
}
