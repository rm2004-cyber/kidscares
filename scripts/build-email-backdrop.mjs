/**
 * Rasterises the storefront's kiddish backdrop into a tiling PNG for emails.
 *
 * The site renders the pattern as an inline data-URI SVG. Gmail strips those
 * and Outlook's Word engine cannot parse SVG at all, so email needs a hosted
 * raster instead. Generating it from `lib/theme/surfaces.ts` — rather than
 * hand-drawing a second asset — keeps the two in step: change a glyph on the
 * site, re-run this, and the email follows.
 *
 *   npm run build:email-backdrop
 *
 * Needs Google Chrome installed; it is the rasteriser, so no image library
 * lands in the dependency tree for a file that changes once a year.
 */
import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* The TS sources import siblings without a file extension, which Node's
   resolver requires. Fill it in rather than editing app code to suit a script. */
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        /* fall through to the original specifier */
      }
    }
    return next(specifier, context);
  },
});

const { resolveSurface, surfacePattern } = await import("../src/lib/theme/surfaces.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "public/email/backdrop.png");

/** Tile edge in px. Smaller than the site's 260 so it repeats more often in
    the narrow margins either side of a 560px email card. */
const TILE = 180;
/** Heavier than on screen — email clients render faint art almost invisibly. */
const OPACITY = 0.24;
const CREAM = "#fffaf6";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH and retry.`);
  process.exit(1);
}

const css = surfacePattern(resolveSurface("default"), OPACITY);
const svg = decodeURIComponent(
  css.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, ""),
)
  // Bake the ground in: a transparent tile over a bgcolor renders grey in Outlook.
  .replace(/viewBox="0 0 (\d+) \1">/, (m, n) => `${m}<rect width="${n}" height="${n}" fill="${CREAM}"/>`)
  .replace(/^<svg width="\d+" height="\d+"/, `<svg width="${TILE}" height="${TILE}"`)
  .replace(/(<svg[^>]*?)width="\d+" height="\d+"/, `$1width="${TILE}" height="${TILE}"`);

const dir = mkdtempSync(join(tmpdir(), "kc-backdrop-"));
const page = join(dir, "tile.html");
const shot = join(dir, "tile.png");

writeFileSync(
  page,
  `<body style="margin:0"><div style="width:${TILE}px;height:${TILE}px">${svg}</div></body>`,
);

execFileSync(CHROME, [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  `--screenshot=${shot}`,
  `--window-size=${TILE},${TILE}`,
  page,
], { stdio: "ignore" });

copyFileSync(shot, OUT);
rmSync(dir, { recursive: true, force: true });

console.log(`Wrote ${OUT} (${TILE}×${TILE}, opacity ${OPACITY})`);
