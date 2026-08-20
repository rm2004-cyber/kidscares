import { Glyph } from "@/components/ui/Glyph";

const MESSAGES = [
  "Free delivery on orders above ₹999",
  "Extra 10% off your first order — code HELLOKIDS",
  "Easy 30-day returns, no questions asked",
  "Every toy age-graded & safety tested",
  "COD available across 24,000+ pincodes",
];

/**
 * Infinite marquee. The list is rendered twice and translated by -50%, so the
 * loop is seamless without measuring anything at runtime.
 */
export function AnnouncementBar() {
  return (
    <div className="overflow-hidden bg-ink py-2 text-white">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap will-change-transform">
        {[0, 1].map((pass) => (
          <div key={pass} className="flex gap-10" aria-hidden={pass === 1}>
            {MESSAGES.map((m) => (
              <span key={m} className="flex items-center gap-2 text-xs font-medium">
                <Glyph name="star" className="size-3 text-sun-300" />
                {m}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
