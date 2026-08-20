import Link from "next/link";
import { Glyph } from "@/components/ui/Glyph";
import { topCategories } from "@/lib/data";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Glyph name="teddy" className="size-24 text-brand-400" />
      <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
        This page wandered off
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        The link may be old, or the product may have sold out. Here is where most
        people go next.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {topCategories.map((c) => (
          <Link
            key={c._id}
            href={`/category/${c.slug}`}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition hover:border-brand-300 hover:text-brand-600"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
      >
        Back to home
      </Link>
    </div>
  );
}
