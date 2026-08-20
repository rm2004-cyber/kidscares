import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a KidsCares account for faster checkout and order tracking.",
  robots: { index: false, follow: true },
};

/**
 * The form reads `?next=` with `useSearchParams`, which opts the subtree into
 * client-side rendering. The Suspense boundary keeps the rest of the page
 * prerenderable instead of failing the whole route at build time.
 */
export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-7 w-2/3 rounded-xl" />
      <div className="skeleton h-4 w-full rounded-lg" />
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="skeleton h-12 w-full rounded-full" />
    </div>
  );
}
