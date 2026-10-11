// Generates the PWA icons in public/icons from the warm brand palette.
//
// No image libraries are available in CI, so this writes PNGs by hand using
// node:zlib. The mark is a cream disk with a gold ring and a brown eight-point
// star (a khatim) on a warm-brown field, matching assets/icon.png's palette.
//
//   node scripts/generate-pwa-icons.mjs
//
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');

// Brand palette (see src/theme/colors.ts).
const BROWN = [0x79, 0x57, 0x46];
const CREAM = [0xff, 0xfa, 0xf5];
const GOLD = [0xad, 0x90, 0x64];

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

/** Encode an RGB (colorType 2) PNG from a width*height*3 byte buffer. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- mark render

/** Is the point (x,y) inside the 8-point star made of two squares? */
function inStar(dx, dy, a) {
  const rot = Math.PI / 4;
  const ux = dx * Math.cos(rot) + dy * Math.sin(rot);
  const uy = -dx * Math.sin(rot) + dy * Math.cos(rot);
  return (Math.abs(dx) <= a && Math.abs(dy) <= a) || (Math.abs(ux) <= a && Math.abs(uy) <= a);
}

/** Pick the mark colour for a normalised point. */
function sample(nx, ny, radius) {
  const dist = Math.hypot(nx, ny);
  // Gold ring just inside the field.
  if (dist > radius * 0.92 && dist <= radius) return GOLD;
  // Cream disk.
  if (dist <= radius * 0.92) {
    // Brown khatim in the centre.
    if (inStar(nx, ny, radius * 0.56)) return BROWN;
    return CREAM;
  }
  return BROWN;
}

/**
 * Render an icon at `size` px. `markRadius` is the mark's outer radius as a
 * fraction of half the width (0.79 leaves room for Android's maskable crop).
 */
function renderIcon(size, markRadius) {
  const SS = 3; // supersample factor for smooth edges
  const big = size * SS;
  const half = big / 2;
  const radius = half * markRadius;
  const rgb = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5;
          const py = y * SS + sy + 0.5;
          const col = sample(px - half, py - half, radius);
          r += col[0];
          g += col[1];
          b += col[2];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 3;
      rgb[i] = Math.round(r / n);
      rgb[i + 1] = Math.round(g / n);
      rgb[i + 2] = Math.round(b / n);
    }
  }
  return encodePng(size, size, rgb);
}

mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, radius: 0.79 },
  { name: 'icon-512.png', size: 512, radius: 0.79 },
  { name: 'icon-512-maskable.png', size: 512, radius: 0.62 },
  { name: 'apple-touch-icon.png', size: 180, radius: 0.79 },
];

for (const { name, size, radius } of targets) {
  const file = join(outDir, name);
  writeFileSync(file, renderIcon(size, radius));
  console.log(`Wrote ${file}`);
}
