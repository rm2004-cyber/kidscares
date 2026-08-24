/**
 * Rasterises the storefront's kiddish backdrop into a tiling PNG for emails
 * and uploads it to Cloudinary.
 *
 * The site renders the pattern as an inline data-URI SVG. Gmail strips those
 * and Outlook's Word engine cannot parse SVG at all, so email needs a hosted
 * raster instead. Generating it from `lib/theme/surfaces.ts` — rather than
 * hand-drawing a second asset — keeps the two in step: change a glyph on the
 * site, re-run this, and the email follows.
 *
 *   CHROME_PATH="<path-to-chrome>" npm run build:email-backdrop
 *
 * Emails always use this one neutral theme. Needs Google Chrome installed; it
 * is the rasteriser, so no image library lands in the dependency tree for a
 * file that changes once a year. Cloudinary credentials are read from
 * server/.env when present; without them the tile is still written locally.
 */
import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public/email");

const { resolveSurface, surfacePattern } = await import("../src/lib/theme/surfaces.ts");
const surface = resolveSurface(null); /* the neutral KidsCares theme */

/** Tile edge in px. Smaller than the site's 260 so it repeats more often in
    the narrow margins either side of a 560px email card. */
const TILE = 180;
/** Heavier than on screen — email clients render faint art almost invisibly. */
const OPACITY = 0.24;
const CREAM = "#fffaf6";

const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH and retry.`);
  process.exit(1);
}

/* Cloudinary upload is optional: without creds the tile stays a local file. */
let cloudinary = null;
try {
  const serverRequire = createRequire(join(root, "server/package.json"));
  const parsed = serverRequire("dotenv").config({
    path: join(root, "server/.env"),
  }).parsed ?? {};
  if (parsed.CLOUDINARY_CLOUD_NAME && parsed.CLOUDINARY_API_KEY && parsed.CLOUDINARY_API_SECRET) {
    cloudinary = serverRequire("cloudinary").v2;
    cloudinary.config({
      cloud_name: parsed.CLOUDINARY_CLOUD_NAME,
      api_key: parsed.CLOUDINARY_API_KEY,
      api_secret: parsed.CLOUDINARY_API_SECRET,
    });
  }
} catch {
  /* fall through with no uploader */
}

const svgFor = () => {
  const pattern = surfacePattern(surface, OPACITY);
  return decodeURIComponent(
    pattern.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, ""),
  )
    // Bake the ground in: a transparent tile over a bgcolor renders grey in Outlook.
    .replace(/viewBox="0 0 (\d+) \1">/, (m, n) => `${m}<rect width="${n}" height="${n}" fill="${CREAM}"/>`)
    .replace(/(<svg[^>]*?)width="\d+" height="\d+"/, `$1width="${TILE}" height="${TILE}"`);
};

mkdirSync(OUT_DIR, { recursive: true });

const dir = mkdtempSync(join(tmpdir(), `kc-backdrop-`));
const page = join(dir, "tile.html");
const shot = join(dir, "tile.png");

writeFileSync(
  page,
  `<body style="margin:0"><div style="width:${TILE}px;height:${TILE}px">${svgFor()}</div></body>`,
);

execFileSync(CHROME, [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  `--screenshot=${shot}`,
  `--window-size=${TILE},${TILE}`,
  page,
], { stdio: "ignore" });

copyFileSync(shot, join(OUT_DIR, "backdrop-default.png"));

if (cloudinary) {
  try {
    const res = await cloudinary.uploader.upload(shot, {
      folder: "kidscares/email-backdrops",
      public_id: "default",
      overwrite: true,
      invalidate: true,
    });
    console.log(`Uploaded → ${res.secure_url}`);
  } catch (e) {
    console.warn(`Cloudinary upload failed: ${e.message}`);
  }
} else {
  console.log("Cloudinary not configured — tile written locally only.");
}

rmSync(dir, { recursive: true, force: true });
console.log("Local copy → public/email/backdrop-default.png");
