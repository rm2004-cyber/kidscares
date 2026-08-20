import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { toFormValue } from "@/lib/admin/productForm";
import { categories, getAgeGroups, getBrands, products } from "@/lib/data";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((p) => p._id === id);
  if (!product) notFound();

  const [brands, ageGroups] = await Promise.all([getBrands(), getAgeGroups()]);

  return (
    <ProductForm
      mode="edit"
      initial={toFormValue(product)}
      brands={brands.map((b) => b.name)}
      categories={categories
        .filter((c) => c.parent !== null || !categories.some((s) => s.parent === c.slug))
        .map((c) => ({ slug: c.slug, name: c.name }))}
      ageGroups={ageGroups.map((a) => ({ slug: a.slug, label: a.label }))}
    />
  );
}
