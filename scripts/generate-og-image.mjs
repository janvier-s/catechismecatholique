/**
 * Generates static/img/og-image.png (1200×630) from the project logo.
 * Run once with: node scripts/generate-og-image.mjs
 */

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

// ─── Palette (from app.css :root) ────────────────────────────────────────────
const BG = '#f8f5ef';
const FG = '#1c1710';
const MUTED = '#6b6560';
const ACCENT = '#a62c2c';
const BORDER = '#e0d8cc';

// ─── Dimensions ──────────────────────────────────────────────────────────────
const W = 1200,
	H = 630;

// Left logo zone ends here; text lives in the right zone.
const DIVIDER_X = 432;
// Center of the right text column
const TEXT_CX = Math.round((DIVIDER_X + W - 20) / 2); // ≈ 806

// ─── Embed logo as base64 ────────────────────────────────────────────────────
// Upscale the 192px logo to 290px for crisp rendering.
const logoResized = await sharp(resolve(root, 'static/img/logo/logo-192.png'))
	.resize(290, 290)
	.png()
	.toBuffer();

const logoB64 = logoResized.toString('base64');
const logoX = Math.round((DIVIDER_X - 290) / 2); // ≈ 71
const logoY = Math.round((H - 290) / 2); // ≈ 170

// ─── SVG ─────────────────────────────────────────────────────────────────────
const svg = `<svg
  width="${W}" height="${H}"
  viewBox="0 0 ${W} ${H}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Frame: outer -->
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}"
        fill="none" stroke="${BORDER}" stroke-width="1"/>
  <!-- Frame: inner -->
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}"
        fill="none" stroke="${BORDER}" stroke-width="0.5"/>

  <!-- Logo -->
  <image
    x="${logoX}" y="${logoY}"
    width="290" height="290"
    href="data:image/png;base64,${logoB64}"
    style="mix-blend-mode:multiply"/>

  <!-- Vertical divider -->
  <line
    x1="${DIVIDER_X}" y1="60" x2="${DIVIDER_X}" y2="${H - 60}"
    stroke="${BORDER}" stroke-width="1"/>

  <!-- ✠ Fleuron -->
  <text
    x="${TEXT_CX}" y="224"
    font-family="Libre Baskerville, Georgia, serif"
    font-size="22"
    fill="${ACCENT}"
    text-anchor="middle">✠</text>

  <!-- Main title -->
  <text
    x="${TEXT_CX}" y="316"
    font-family="Libre Baskerville, Georgia, serif"
    font-size="84"
    font-weight="bold"
    fill="${FG}"
    text-anchor="middle">Catéchisme</text>

  <!-- Subtitle line 1 -->
  <text
    x="${TEXT_CX}" y="364"
    font-family="Libre Baskerville, Georgia, serif"
    font-size="32"
    fill="${FG}"
    text-anchor="middle">de l'Église Catholique</text>

  <!-- Accent rule -->
  <line
    x1="${TEXT_CX - 130}" y1="400" x2="${TEXT_CX + 130}" y2="400"
    stroke="${ACCENT}" stroke-width="1.5"/>

  <!-- Tagline -->
  <text
    x="${TEXT_CX}" y="438"
    font-family="Montserrat, Avenir Next, Helvetica Neue, sans-serif"
    font-size="12"
    font-weight="500"
    fill="${MUTED}"
    text-anchor="middle"
    letter-spacing="3">ÉDITION FRANÇAISE DÉFINITIVE</text>

  <!-- URL -->
  <text
    x="${TEXT_CX}" y="468"
    font-family="Montserrat, Avenir Next, Helvetica Neue, sans-serif"
    font-size="13"
    fill="${ACCENT}"
    text-anchor="middle"
    letter-spacing="1">catechismecatholique.fr</text>

</svg>`;

// ─── Render ───────────────────────────────────────────────────────────────────
const outPath = resolve(root, 'static/img/og-image.png');

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);

console.log(`✓ og-image.png written → ${outPath}`);

// Also output a WebP variant (smaller, supported everywhere og:image is used)
const webpPath = resolve(root, 'static/img/og-image.webp');
await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(webpPath);

console.log(`✓ og-image.webp written → ${webpPath}`);
