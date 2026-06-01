/**
 * Generates placeholder sprite sheet PNGs for Issue #15.
 * When real pixel-art assets arrive, replace these files (same filenames).
 * Run: node scripts/generate-placeholders.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'frontend', 'public', 'assets', 'sprites');

// ── CRC32 (required for PNG chunks) ─────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk builder ────────────────────────────────────────────────────────
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([tb, data]);
  const out = Buffer.allocUnsafe(4 + 4 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  tb.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(combined), 8 + data.length);
  return out;
}

// ── PNG file builder (RGBA) ──────────────────────────────────────────────────
function buildPng(width, height, rgba) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowSize = 1 + width * 4;
  const raw = Buffer.allocUnsafe(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * rowSize + 1 + x * 4;
      raw[di] = rgba[si]; raw[di+1] = rgba[si+1];
      raw[di+2] = rgba[si+2]; raw[di+3] = rgba[si+3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Sprite sheet generator ───────────────────────────────────────────────────
// Alternating bright/dark frames with a 1px black grid border.
function makeSpriteSheet(width, height, frameW, frameH, [r, g, b]) {
  const cols = Math.floor(width / frameW);
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const fc = Math.floor(x / frameW);
      const fr = Math.floor(y / frameH);
      const fi = fr * cols + fc;
      const onGrid = x % frameW === 0 || y % frameH === 0 || x === width-1 || y === height-1;

      if (onGrid) {
        rgba[pi] = 20; rgba[pi+1] = 20; rgba[pi+2] = 20; rgba[pi+3] = 230;
      } else {
        const bright = fi % 2 === 0 ? 1.0 : 0.7;
        rgba[pi]   = Math.min(255, Math.round(r * bright));
        rgba[pi+1] = Math.min(255, Math.round(g * bright));
        rgba[pi+2] = Math.min(255, Math.round(b * bright));
        rgba[pi+3] = 230;
      }
    }
  }
  return buildPng(width, height, rgba);
}

function write(relPath, data) {
  const full = join(PUBLIC, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  console.log('  wrote', relPath);
}

// ── Generate ─────────────────────────────────────────────────────────────────

// Body: 320x128, frameW=64, frameH=64, 5×2=10 frames
// Row 0: front walk (frames 0-4), Row 1: back walk (frames 5-9)
write('body/body_pale.png',   makeSpriteSheet(320, 128, 64, 64, [255, 224, 190]));
write('body/body_medium.png', makeSpriteSheet(320, 128, 64, 64, [220, 170, 120]));

// Face: 160x48, frameW=16, frameH=16, 10×3=30 frames
// Col = typeId-1, Row 0 = base frame used in game
write('face/eyes.png',     makeSpriteSheet(160, 48, 16, 16, [60,  80, 200]));
write('face/mouth.png',    makeSpriteSheet(160, 48, 16, 16, [200, 80,  80]));
write('face/eyebrows.png', makeSpriteSheet(160, 48, 16, 16, [80,  50,  30]));

// Hair: 128x64, frameW=64, frameH=64, 2 frames (frame0=front, frame1=back)
export const HAIR_STYLES = [
  'short', 'long', 'bob', 'ponytail', 'bun',
  'wavy', 'curly', 'straight', 'layered', 'pixie',
  'braided', 'afro', 'mohawk', 'undercut', 'fringe',
  'twintail', 'spiky', 'swept', 'loose', 'mushroom',
];
const HAIR_COLORS = [
  [60, 40, 23], [180, 130, 60], [30, 30, 30], [200, 100, 60],
  [220, 200, 180], [150, 80, 160], [90, 60, 30], [210, 160, 90],
];
for (let i = 0; i < 20; i++) {
  const pad = String(i + 1).padStart(2, '0');
  const color = HAIR_COLORS[i % HAIR_COLORS.length];
  write(`hair/hair_${pad}_${HAIR_STYLES[i]}.png`, makeSpriteSheet(128, 64, 64, 64, color));
}

// Clothing: 320x128, frameW=64, frameH=64, 5×2=10 frames (same walk layout as body)
const TOP_COLORS = [
  [80, 120, 200], [80, 180, 100], [200, 100, 80], [140, 80, 200],
  [60, 180, 180], [200, 160, 60], [160, 60, 80], [60, 140, 160],
];
const BOTTOM_COLORS = [
  [40, 60, 160], [40, 120, 60], [120, 40, 40], [80, 40, 120],
  [40, 100, 100], [120, 100, 40], [100, 40, 60], [40, 80, 100],
];
for (let i = 0; i < 20; i++) {
  const pad = String(i + 1).padStart(2, '0');
  write(`clothing/top_${pad}_style.png`,    makeSpriteSheet(320, 128, 64, 64, TOP_COLORS[i % TOP_COLORS.length]));
  write(`clothing/bottom_${pad}_style.png`, makeSpriteSheet(320, 128, 64, 64, BOTTOM_COLORS[i % BOTTOM_COLORS.length]));
}

// Shoes: 640x128, frameW=64, frameH=64, 10×2 (col=shoeId-1, row0=front, row1=back)
write('shoes/shoes_all.png', makeSpriteSheet(640, 128, 64, 64, [40, 40, 40]));

// Accessories: 640x128, frameW=64, frameH=64, 10×2
write('accessories/accessories_all.png', makeSpriteSheet(640, 128, 64, 64, [200, 180, 60]));

// Environment (basic placeholders for future use)
write('environment/floor_tiles.png', makeSpriteSheet(256, 256, 32, 32, [40, 50, 60]));
write('environment/wall_tiles.png',  makeSpriteSheet(256, 256, 32, 32, [60, 60, 70]));
write('environment/desks.png',       makeSpriteSheet(256, 128, 64, 64, [100, 80, 60]));
write('environment/chairs.png',      makeSpriteSheet(128, 128, 32, 32, [80, 60, 40]));

console.log('Done!');
