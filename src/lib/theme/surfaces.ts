import { GLYPHS } from "./icons";

/**
 * Per-category surface themes.
 *
 * A theme is a wash (three radial tints + a base gradient) plus a set of
 * glyphs tiled behind the page. Switching category swaps the theme, and the
 * Backdrop crossfades between the old and new one.
 */

export type Surface = {
  key: string;
  label: string;
  /** [tintA, tintB, tintC] as rgb triples, used for the radial washes. */
  tints: [string, string, string];
  /** Base vertical gradient — kept very pale so text contrast never suffers. */
  base: [string, string, string];
  /** Glyph names drawn into the tile, in order. */
  glyphs: string[];
  /** Ink used for the glyphs. */
  glyphColor: string;
};

const SURFACES: Surface[] = [
  {
    key: "default",
    label: "KidsCares",
    tints: ["255,197,49", "124,83,245", "56,211,145"],
    base: ["#fffdfb", "#fdfbff", "#f8fcff"],
    glyphs: ["teddy", "tshirt", "sneaker", "block", "bottle", "star", "balloon", "heart"],
    glyphColor: "247,77,63",
  },
  {
    key: "clothing",
    label: "Clothing",
    tints: ["247,77,63", "255,156,192", "255,197,49"],
    base: ["#fffcfb", "#fff8f7", "#fff6f8"],
    glyphs: ["tshirt", "dress", "pants", "sock", "hanger", "jacket", "heart", "star"],
    glyphColor: "224,52,31",
  },
  {
    key: "footwear",
    label: "Footwear",
    tints: ["52,166,232", "124,83,245", "56,211,145"],
    base: ["#fbfdff", "#f7fbff", "#f6faff"],
    glyphs: ["sneaker", "boot", "sandal", "sock", "star", "spark", "sneaker", "boot"],
    glyphColor: "23,110,168",
  },
  {
    key: "toys",
    label: "Toys",
    tints: ["255,197,49", "247,77,63", "56,211,145"],
    base: ["#fffdf7", "#fffcf3", "#fffaf4"],
    glyphs: ["block", "ball", "rocket", "puzzle", "robot", "star", "spark", "balloon"],
    glyphColor: "201,133,0",
  },
  {
    key: "soft-toys",
    label: "Soft Toys",
    tints: ["124,83,245", "255,156,192", "52,166,232"],
    base: ["#fdfcff", "#fbf9ff", "#f9f8ff"],
    glyphs: ["teddy", "bunny", "cloud", "heart", "star", "moon", "teddy", "spark"],
    glyphColor: "101,53,224",
  },
  {
    key: "daily-needs",
    label: "Daily Needs",
    tints: ["56,211,145", "52,166,232", "255,197,49"],
    base: ["#fafffc", "#f7fefb", "#f6fdfa"],
    glyphs: ["bottle", "pacifier", "droplet", "duck", "cloud", "star", "bottle", "heart"],
    glyphColor: "8,148,94",
  },
  {
    key: "baby-care",
    label: "Baby Care",
    tints: ["255,156,192", "56,211,145", "255,197,49"],
    base: ["#fffcfd", "#fffafc", "#fff9fb"],
    glyphs: ["droplet", "duck", "cloud", "heart", "pacifier", "star", "droplet", "spark"],
    glyphColor: "214,72,131",
  },
  {
    key: "school-supplies",
    label: "School & Stationery",
    tints: ["52,166,232", "255,197,49", "124,83,245"],
    base: ["#fbfdff", "#f9fcff", "#f8fbff"],
    glyphs: ["backpack", "pencil", "book", "star", "spark", "backpack", "pencil", "book"],
    glyphColor: "23,110,168",
  },
  {
    key: "nursery",
    label: "Nursery & Furniture",
    tints: ["124,83,245", "52,166,232", "255,156,192"],
    base: ["#fdfcff", "#fbfaff", "#f9f9ff"],
    glyphs: ["crib", "moon", "cloud", "star", "teddy", "spark", "crib", "heart"],
    glyphColor: "101,53,224",
  },
];

export const SURFACE_BY_KEY = new Map(SURFACES.map((s) => [s.key, s]));

/** Falls back to the neutral theme for any slug without its own surface. */
export function resolveSurface(key: string | null | undefined): Surface {
  if (!key) return SURFACE_BY_KEY.get("default")!;
  // Sub-categories inherit their parent aisle: "clothing/dresses" → "clothing".
  const root = key.split("/")[0];
  return SURFACE_BY_KEY.get(root) ?? SURFACE_BY_KEY.get("default")!;
}

/* ------------------------------------------------------------ rendering */

/** Fixed scatter so every tile is identical and seamless when repeated. */
const SLOTS = [
  { x: 26, y: 30, s: 1.5, r: -12 },
  { x: 128, y: 18, s: 1.1, r: 14 },
  { x: 210, y: 58, s: 1.35, r: -6 },
  { x: 62, y: 116, s: 1.15, r: 20 },
  { x: 168, y: 132, s: 1.5, r: -16 },
  { x: 20, y: 196, s: 1.2, r: 8 },
  { x: 116, y: 212, s: 1.4, r: -20 },
  { x: 214, y: 178, s: 1.05, r: 12 },
];

const TILE = 260;

/**
 * Builds the tiled pattern as an SVG data URI.
 *
 * Note the `#` and `%` escaping: an unencoded `#` terminates a CSS url(),
 * which silently blanks the whole background.
 */
export function surfacePattern(surface: Surface, opacity = 0.09): string {
  const body = SLOTS.map((slot, i) => {
    const name = surface.glyphs[i % surface.glyphs.length];
    const glyph = GLYPHS[name] ?? GLYPHS.star;
    return (
      `<g transform="translate(${slot.x} ${slot.y}) rotate(${slot.r}) scale(${slot.s})" opacity="${opacity}">` +
      glyph.replace(/CC/g, `rgb(${surface.glyphColor})`) +
      `</g>`
    );
  }).join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">${body}</svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function surfaceWash(surface: Surface): string {
  const [a, b, c] = surface.tints;
  const [g1, g2, g3] = surface.base;
  return [
    `radial-gradient(900px 480px at 8% 0%, rgba(${a},0.13), transparent 62%)`,
    `radial-gradient(820px 460px at 95% 6%, rgba(${b},0.11), transparent 64%)`,
    `radial-gradient(780px 430px at 60% 100%, rgba(${c},0.11), transparent 62%)`,
    `linear-gradient(180deg, ${g1} 0%, ${g2} 45%, ${g3} 100%)`,
  ].join(",");
}

export { TILE as SURFACE_TILE };
