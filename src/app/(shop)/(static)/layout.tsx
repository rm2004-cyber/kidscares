/**
 * Shared shell for editorial/legal pages. Grouped so these routes share
 * typography without adding a URL segment.
 */
export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="prose-kidscare space-y-4 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-ink-soft [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-soft [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </article>
    </div>
  );
}
