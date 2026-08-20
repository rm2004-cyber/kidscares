import { CategoriesView } from "./CategoriesView";
import { getAllCategories } from "@/lib/data";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();
  return <CategoriesView categories={categories} />;
}
