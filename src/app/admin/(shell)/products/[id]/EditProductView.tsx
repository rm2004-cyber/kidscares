"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { ProductForm } from "@/components/admin/ProductForm";
import { toFormValue, type ProductFormValue } from "@/lib/admin/productForm";
import { adminApi, ApiError } from "@/utils/service";
import type { Product } from "@/lib/types";

/**
 * Loads one product and seeds the editor.
 *
 * Fetched through the admin list endpoint rather than the public product route
 * because an inactive (soft-deleted) product must still be editable — the
 * public route filters those out.
 */
export function EditProductView({ productId }: { productId: string }) {
  const [initial, setInitial] = useState<ProductFormValue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .listProducts({ limit: 100 })
      .then((res) => {
        const found = ((res?.data ?? []) as Product[]).find((p) => p._id === productId);
        if (!found) {
          setError("Product not found.");
          return;
        }
        setInitial(toFormValue(found));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this product."),
      );
  }, [productId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center">
        <AlertCircle className="mx-auto size-8 text-brand-500" />
        <p className="mt-2 text-sm font-bold text-ink">{error}</p>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-ink-soft">
        <Loader2 className="size-5 animate-spin text-brand-500" />
        Loading product…
      </div>
    );
  }

  return <ProductForm mode="edit" productId={productId} initial={initial} />;
}
