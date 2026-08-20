import { BrandsView } from "./BrandsView";
import { getAllProducts, getBrands } from "@/lib/data";

export const metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  const [brands, products] = await Promise.all([getBrands(), getAllProducts()]);
  return <BrandsView brands={brands} products={products} />;
}
