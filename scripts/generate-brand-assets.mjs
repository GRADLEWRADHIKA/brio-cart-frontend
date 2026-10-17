/**
 * Renders Brio Cart brand assets from SVG:
 *   assets/icon-only.png, icon-foreground.png, icon-background.png  (Android adaptive icon sources)
 *   assets/splash.png, splash-dark.png                               (Android splash sources)
 *   public/icon-192.png, icon-512.png                                (web app manifest)
 * `npm run assets:generate` then runs @capacitor/assets to produce every Android density.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets');
mkdirSync(out, { recursive: true });

const FOREST = '#0f3d26';
const FOREST_DARK = '#0b2a1b';
const IVORY = '#fdfbf6';
const LIME = '#c8e86b';

/** The Brio Cart mark (cart with motion lines and a sprouting leaf), drawn on a 48×48 grid. */
const mark = (fg = IVORY, leaf = LIME, vein = FOREST) => `
  <path d="M3 17h7M1.5 22.5h7M4 28h6" stroke="${leaf}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
  <path d="M11 9h4.2c.9 0 1.7.6 1.9 1.5L22 31.5c.2.9 1 1.5 1.9 1.5h13.4c.9 0 1.6-.6 1.9-1.4l3.6-12.2c.4-1.3-.6-2.6-1.9-2.6H18"
        stroke="${fg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24.5" cy="40" r="3.1" fill="${fg}"/>
  <circle cx="36.5" cy="40" r="3.1" fill="${fg}"/>
  <path d="M30.5 23.5c-.3-5 2.7-9.6 9.8-10.7.6 6.4-3.2 10.4-9.8 10.7Z" fill="${leaf}"/>
  <path d="M30.6 23.4c1.6-3.3 3.6-5.4 6-6.8" stroke="${vein}" stroke-width="1.2" stroke-linecap="round" fill="none"/>`;

/** Subtle radial glow so flat colour doesn't look like a placeholder. */
const glow = (w, h, color = '#2e7d4f', op = 0.55) => `
  <defs><radialGradient id="g" cx="50%" cy="38%" r="65%">
    <stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>`;

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

// Mark centred in a box of `size` px at (cx, cy).
const placeMark = (cx, cy, size, ...colors) => `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 48})">${mark(...colors)}</g>`;

async function main() {
  // Full icon (legacy launcher + web): rounded tile.
  const icon = svg(1024, 1024, `<rect width="1024" height="1024" rx="0" fill="${FOREST}"/>${glow(1024, 1024)}${placeMark(512, 512, 600)}`);
  await sharp(icon).png().toFile(path.join(out, 'icon-only.png'));

  // Adaptive icon: foreground keeps the mark inside the 66% safe zone.
  await sharp(svg(1024, 1024, placeMark(512, 512, 520))).png().toFile(path.join(out, 'icon-foreground.png'));
  await sharp(svg(1024, 1024, `<rect width="1024" height="1024" fill="${FOREST}"/>${glow(1024, 1024)}`)).png().toFile(path.join(out, 'icon-background.png'));

  // Splash: mark + wordmark + tagline.
  const splash = (bg) =>
    svg(
      2732,
      2732,
      `<rect width="2732" height="2732" fill="${bg}"/>${glow(2732, 2732, '#2e7d4f', 0.45)}
       ${placeMark(1366, 1180, 420)}
       <text x="1366" y="1560" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="190" font-weight="600" fill="${IVORY}" letter-spacing="-4">Brio<tspan fill="${LIME}">Cart</tspan></text>
       <text x="1366" y="1680" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="${IVORY}" fill-opacity="0.6" letter-spacing="14">FRESH · SAFE · RESPONSIBLE</text>`,
    );
  await sharp(splash(FOREST)).png().toFile(path.join(out, 'splash.png'));
  await sharp(splash(FOREST_DARK)).png().toFile(path.join(out, 'splash-dark.png'));

  // Web manifest icons.
  const pub = path.join(root, 'public');
  const webIcon = svg(512, 512, `<rect width="512" height="512" rx="112" fill="${FOREST}"/>${glow(512, 512)}${placeMark(256, 256, 320)}`);
  await sharp(webIcon).resize(512, 512).png().toFile(path.join(pub, 'icon-512.png'));
  await sharp(webIcon).resize(192, 192).png().toFile(path.join(pub, 'icon-192.png'));

  console.log('Brand assets written to assets/ and public/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
