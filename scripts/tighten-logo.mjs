/**
 * Re-exports the brand artwork with its surrounding whitespace removed.
 *
 * The supplied logos carry roughly a third of their canvas as empty margin, so
 * anything that sets a CSS height was drawing a logo two-thirds that tall and
 * looking undersized no matter what number was used. This measures the real
 * ink bounds and writes trimmed copies that Logo.tsx and the mailer consume.
 *
 *   npm run build:logos
 *
 * Needs the dev server running (the images are read over http so the canvas is
 * not tainted) and Google Chrome as the rasteriser — the same approach as
 * scripts/build-email-backdrop.mjs, and for the same reason: no image library
 * in the dependency tree for a file that changes once a year.
 */
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const ORIGIN = process.env.SITE_ORIGIN ?? "http://localhost:3000";
const CDP = process.env.CDP_URL ?? "http://127.0.0.1:9333";

/** source in public/, output name, and the height to export at */
const JOBS = [
  { src: "/kidscareslogo-mark.png", out: "kidscares-mark.png", height: 320 },
  { src: "/kidscarelogo.png", out: "kidscares-full.png", height: 440 },
];

/** Margin left around the ink, as a share of its height. */
const MARGIN = 0.015;

let id = 0;
const send = (ws, method, params = {}) =>
  new Promise((res, rej) => {
    const mine = ++id;
    const on = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== mine) return;
      ws.removeEventListener("message", on);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id: mine, method, params }));
  });

const open = (url) =>
  new Promise((r) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => r(ws));
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let version;
try {
  version = await (await fetch(`${CDP}/json/version`)).json();
} catch {
  console.error(
    `No Chrome on ${CDP}. Start one with:\n` +
      `  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\\n` +
      `    --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/chrome-logo about:blank`,
  );
  process.exit(1);
}

const browser = await open(version.webSocketDebuggerUrl);
const { targetId } = await send(browser, "Target.createTarget", { url: "about:blank" });
const tab = (await (await fetch(`${CDP}/json/list`)).json()).find((t) => t.id === targetId);
const ws = await open(tab.webSocketDebuggerUrl);
await send(ws, "Page.enable");

/** Tightest box containing pixels that are neither transparent nor near-white. */
async function inkBounds(src) {
  await send(ws, "Page.navigate", { url: ORIGIN });
  await wait(2000);
  const r = await send(ws, "Runtime.evaluate", {
    awaitPromise: true,
    expression: `new Promise((res, rej) => {
      const img = new Image();
      img.onerror = () => rej(new Error("could not load ${src}"));
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const light = d[i] > 245 && d[i+1] > 245 && d[i+2] > 245;
          if (d[i+3] > 24 && !light) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
        res(JSON.stringify({ srcW: c.width, srcH: c.height, minX, minY,
          boxW: maxX - minX + 1, boxH: maxY - minY + 1 }));
      };
      img.src = "${src}";
    })`,
  });
  return JSON.parse(r.result.value);
}

for (const job of JOBS) {
  if (!existsSync(join(PUBLIC, job.src.slice(1)))) {
    console.warn(`skipping ${job.src} — not in public/`);
    continue;
  }

  const b = await inkBounds(job.src);
  const scale = job.height / (b.boxH * (1 + MARGIN * 2));
  const W = Math.round(b.boxW * (1 + MARGIN * 2) * scale);
  const H = Math.round(job.height);

  const html = `<body style="margin:0;overflow:hidden;background:transparent">
    <div style="position:relative;width:${W}px;height:${H}px;overflow:hidden">
      <img src="${job.src}" style="position:absolute;
        left:${-(b.minX - b.boxW * MARGIN) * scale}px;
        top:${-(b.minY - b.boxH * MARGIN) * scale}px;
        width:${b.srcW * scale}px" />
    </div></body>`;

  const page = join(PUBLIC, "_tighten.html");
  writeFileSync(page, html);
  await send(ws, "Emulation.setDeviceMetricsOverride", {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });
  await send(ws, "Page.navigate", { url: `${ORIGIN}/_tighten.html` });
  await wait(1600);
  const shot = await send(ws, "Page.captureScreenshot", { format: "png" });
  writeFileSync(join(PUBLIC, job.out), Buffer.from(shot.data, "base64"));
  try { unlinkSync(page); } catch {}

  const before = Math.round((b.boxH / b.srcH) * 100);
  console.log(
    `${job.out}  ${W}x${H}  ratio ${(W / H).toFixed(3)}  ` +
      `(ink was ${before}% of the original canvas)`,
  );
}

process.exit(0);
