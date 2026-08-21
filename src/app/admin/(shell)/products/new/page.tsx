import { ProductForm } from "@/components/admin/ProductForm";
import { emptyProduct } from "@/lib/admin/productForm";

export const metadata = { title: "Add product" };

export default function NewProductPage() {
  return <ProductForm mode="create" initial={emptyProduct} />;
}
