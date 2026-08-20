import type { NextRequest } from "next/server";
import { GLYPHS } from "@/lib/theme/icons";

/**
 * Local placeholder image service.
 *
 * Stands in for Cloudinary until real photography is uploaded. Everything is
 * generated as SVG so the site renders identically offline and in CI — no
 * external host, no `next.config` remotePatterns, no layout shift.
 *
 * /api/placeholder?w=600&h=800&glyph=tshirt&seed=rompers&label=Rompers
 */

const PALETTES = [
  ["#ffe0dd", "#ffc4bf", "#e0341f"],
  ["#d5fae7", "#aef3d2", "#08945e"],
  ["#fff5d6", "#ffe9a8", "#c98500"],
  ["#f1ecff", "#dfd2ff", "#6535e0"],
  ["#dbf1fd", "#bde5fb", "#176ea8"],
  ["#ffe8f1", "#ffd0e2", "#d64883"],
];

/** Stable string hash so a given seed always yields the same artwork. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;"
      : c === ">" ? "&gt;"
      : c === "&" ? "&amp;"
      : c === "'" ? "&apos;"
      : "&quot;",
  );
}

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const w = Math.min(Number(p.get("w")) || 600, 2400);
  const h = Math.min(Number(p.get("h")) || 600, 2400);
  const seed = p.get("seed") ?? "kidscares";
  const label = p.get("label") ?? "";
  const glyphName = p.get("glyph") ?? "";

  const n = hash(seed);
  const [light, mid, strong] = PALETTES[n % PALETTES.length];

  // Scatter a few soft blobs so cards do not read as flat panels.
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const k = hash(`${seed}-${i}`);
    const cx = ((k % 100) / 100) * w;
    const cy = (((k >> 7) % 100) / 100) * h;
    const r = ((((k >> 13) % 22) + 10) / 100) * Math.min(w, h);
    const op = 0.14 + ((k >> 17) % 20) / 100;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${strong}" opacity="${op.toFixed(2)}"/>`;
  }).join("");

  /* The glyph is authored on a 24×24 grid, so it is translated to the centre
     and scaled up rather than being redrawn per size. */
  const glyphBody = GLYPHS[glyphName];
  let glyph = "";
  if (glyphBody) {
    const target = Math.min(w, h) * 0.34;
    const scale = target / 24;
    const gx = w / 2 - target / 2;
    const gy = (label ? h * 0.46 : h / 2) - target / 2;
    glyph =
      `<g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${scale.toFixed(3)})" ` +
      `stroke-width="1.4" opacity="0.85">` +
      glyphBody.replace(/CC/g, strong) +
      `</g>`;
  }

  const caption = label
    ? `<text x="50%" y="${glyphBody ? "78%" : "52%"}" font-size="${Math.max(13, Math.min(w, h) * 0.07)}"
         font-family="Trebuchet MS, system-ui, sans-serif" font-weight="700"
         fill="${strong}" text-anchor="middle" dominant-baseline="central"
         opacity="0.85">${escapeXml(label)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label || "Product image")}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${blobs}
  ${glyph}
  ${caption}
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
