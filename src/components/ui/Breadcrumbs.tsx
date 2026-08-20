import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { name: string; url: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.url} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-semibold text-ink">
                  {c.name}
                </span>
              ) : (
                <Link href={c.url} className="transition hover:text-brand-600">
                  {c.name}
                </Link>
              )}
              {!last && <ChevronRight className="size-3" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
