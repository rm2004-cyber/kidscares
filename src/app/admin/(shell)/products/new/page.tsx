import { ProductForm } from "@/components/admin/ProductForm";
import { emptyProduct } from "@/lib/admin/productForm";
import { categories, getAgeGroups, getBrands } from "@/lib/data";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [brands, ageGroups] = await Promise.all([getBrands(), getAgeGroups()]);

  return (
    <ProductForm
      mode="create"
      initial={emptyProduct}
      brands={brands.map((b) => b.name)}
      // Leaf categories only — products never attach to a top-level aisle.
      categories={categories
        .filter((c) => c.parent !== null || !categories.some((s) => s.parent === c.slug))
        .map((c) => ({ slug: c.slug, name: c.name }))}
      ageGroups={ageGroups.map((a) => ({ slug: a.slug, label: a.label }))}
    />
  );
}
