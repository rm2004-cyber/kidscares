import { ProductsView } from "./ProductsView";
import { getAllProducts, getBrands, topCategories } from "@/lib/data";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const [products, brands] = await Promise.all([getAllProducts(), getBrands()]);

  return (
    <ProductsView
      products={products}
      brands={brands.map((b) => b.name)}
      categories={topCategories.map((c) => ({ slug: c.slug, name: c.name }))}
    />
  );
}
