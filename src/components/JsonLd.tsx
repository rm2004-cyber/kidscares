/**
 * Emits a JSON-LD block. Rendered from a Server Component so the structured
 * data is present in the initial HTML — crawlers do not wait for hydration.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Data is our own, never user input; escaping `<` guards against a
      // stray sequence closing the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
