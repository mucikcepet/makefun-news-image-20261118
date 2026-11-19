// make.fun entry: "Sum up 18 November's world news in one image" (news-image-20261118).
// Node 22, standard library only. Draws the whole 1024x1024 image procedurally
// (a tiny 5x7 bitmap font + a hand-written PNG encoder) and writes it to
// /output/entry.png — no network, no files read, no randomness, so two runs
// produce byte-identical output.
//
// Design: one bold date, one hero story, six colour-coded stories, one footer
// ticker. Colour is the information system (canvas-design): red = conflict,
// blue = diplomacy, gold = the summit, teal = weather, green = health.
// News, researched 19 Nov 2026 from multiple same-day briefings:
// APEC opens in Shenzhen, Xi meets Putin, Trump joins them Thursday;
// the Quad meets in Manila; US jets hit a missile site on Qeshm Island and
// Iran drones are intercepted over Bahrain and Kuwait; Ukraine hits the
// Kerch Bridge a second day; Peltola wins Alaska, Democrats 56-44 in the
// Senate; Nvidia's board rejects Huang's return as revenue doubles to
// $115.8bn; Cyclone Akvan nears India's east coast; the US loses its
// measles-free status after 26 years and Ebola passes 11,000 cases in
// DR Congo; 950,000 displaced people in Gaza face winter in flood-prone camps.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG output
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ------------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits. Uppercase + digits + punctuation only;
// the renderer uppercases input first, so headlines stay in one clean face.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
};

// --------------------------------------------------------------------- canvas
type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  private px: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    this.fillRect(x, y, w, 1, c);
    this.fillRect(x, y + h - 1, w, 1, c);
    this.fillRect(x, y, 1, h, c);
    this.fillRect(x + w - 1, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let x = cx - dx; x <= cx + dx; x++) this.set(x, cy + dy, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const t = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
    }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, c: RGB): void {
    for (let a = a0; a <= a1; a += 2) {
      const t = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      for (let x = cx - dx; x <= cx + dx; x++) this.set(x, cy + dy, c);
    }
  }
  textWidth(s: string, scale: number): number {
    return s.toUpperCase().length * 6 * scale - scale;
  }
  drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
    const g = FONT[ch];
    if (!g) return;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r] & (1 << (4 - col))) this.fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
  drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
    const up = s.toUpperCase();
    for (let i = 0; i < up.length; i++) this.drawChar(up[i], x + i * 6 * scale, y, scale, c);
  }
  wrap(s: string, scale: number, maxW: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (this.textWidth(next, scale) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  paragraph(s: string, x: number, y: number, scale: number, c: RGB, maxW: number, lh: number): number {
    const lines = this.wrap(s, scale, maxW);
    lines.forEach((ln, i) => this.drawText(ln, x, y + i * lh, scale, c));
    return y + lines.length * lh;
  }
  png(): Buffer {
    return encodePng(this.w, this.h, this.px);
  }
}

// -------------------------------------------------------------------- palette
const INK: RGB = [12, 20, 36]; // deep navy paper
const CARD: RGB = [22, 35, 61]; // card navy
const CARD_LINE: RGB = [46, 62, 96];
const PAPER: RGB = [244, 241, 232]; // warm off-white type
const MUTED: RGB = [158, 172, 196]; // grey-blue body type
const GOLD: RGB = [232, 163, 23]; // the summit / the date
const RED: RGB = [214, 69, 69]; // conflict
const BLUE: RGB = [74, 144, 217]; // diplomacy
const TEAL: RGB = [46, 158, 139]; // weather
const GREEN: RGB = [92, 184, 92]; // health
const VIOLET: RGB = [150, 120, 220]; // tech
const ORANGE: RGB = [224, 122, 42]; // Ukraine

// ---------------------------------------------------------------------- icons
// Small geometric pictograms, drawn in the card's accent colour.
function icon(cv: Canvas, kind: string, x: number, y: number, c: RGB): void {
  if (kind === 'drone') {
    cv.line(x + 4, y + 4, x + 44, y + 44, c);
    cv.line(x + 44, y + 4, x + 4, y + 44, c);
    for (const [cx, cy] of [[8, 8], [40, 8], [8, 40], [40, 40]]) {
      cv.circle(x + cx, y + cy, 7, c);
      cv.fillCircle(x + cx, y + cy, 2, c);
    }
    cv.fillCircle(x + 24, y + 24, 5, c);
  } else if (kind === 'bridge') {
    cv.line(x + 2, y + 34, x + 46, y + 34, c);
    cv.arc(x + 24, y + 34, 20, 180, 360, c);
    cv.arc(x + 24, y + 34, 14, 180, 360, c);
    for (const px of [8, 24, 40]) cv.line(x + px, y + 20, x + px, y + 34, c);
    cv.line(x + 30, y + 12, x + 40, y + 22, c); // broken span
  } else if (kind === 'senate') {
    cv.fillRect(x + 10, y + 20, 28, 22, c);
    cv.fillRect(x + 6, y + 14, 36, 6, c);
    cv.fillRect(x + 20, y + 6, 8, 8, PAPER);
    cv.line(x + 14, y + 32, x + 20, y + 38, PAPER);
    cv.line(x + 20, y + 38, x + 34, y + 24, PAPER);
  } else if (kind === 'chip') {
    cv.fillRect(x + 12, y + 12, 24, 24, c);
    cv.fillRect(x + 19, y + 19, 10, 10, INK);
    for (let i = 0; i < 3; i++) {
      cv.line(x + 16 + i * 8, y + 4, x + 16 + i * 8, y + 12, c);
      cv.line(x + 16 + i * 8, y + 36, x + 16 + i * 8, y + 44, c);
      cv.line(x + 4, y + 16 + i * 8, x + 12, y + 16 + i * 8, c);
      cv.line(x + 36, y + 16 + i * 8, x + 44, y + 16 + i * 8, c);
    }
  } else if (kind === 'cyclone') {
    cv.arc(x + 24, y + 24, 20, 0, 270, c);
    cv.arc(x + 24, y + 24, 14, 90, 360, c);
    cv.arc(x + 24, y + 24, 8, 180, 450, c);
    cv.fillCircle(x + 24, y + 24, 3, c);
  } else if (kind === 'health') {
    cv.circle(x + 24, y + 24, 20, c);
    cv.fillRect(x + 20, y + 12, 8, 24, c);
    cv.fillRect(x + 12, y + 20, 24, 8, c);
  }
}

// --------------------------------------------------------------------- layout
interface Story {
  tag: string;
  color: RGB;
  icon: string;
  head: string;
  body: string;
}

const STORIES: Story[] = [
  {
    tag: 'GULF',
    color: RED,
    icon: 'drone',
    head: 'Iran drones hit Gulf bases',
    body: 'US jets struck a missile site on Qeshm Island. Bahrain and Kuwait intercepted drone attacks.',
  },
  {
    tag: 'UKRAINE',
    color: ORANGE,
    icon: 'bridge',
    head: 'Kerch Bridge hit again',
    body: 'Ukraine struck the bridge to Crimea for a second day. Part of the road span collapsed.',
  },
  {
    tag: 'USA',
    color: BLUE,
    icon: 'senate',
    head: 'Democrats take the Senate',
    body: 'Mary Peltola wins Alaska. Democrats lead 56-44.',
  },
  {
    tag: 'TECH',
    color: VIOLET,
    icon: 'chip',
    head: 'Nvidia says no to Huang',
    body: "Board rejects the ex-CEO's return. Revenue doubled to $115.8bn.",
  },
  {
    tag: 'INDIA',
    color: TEAL,
    icon: 'cyclone',
    head: 'Cyclone Akvan nears India',
    body: 'Severe storm heads for Odisha and Andhra Pradesh. Evacuations under way.',
  },
  {
    tag: 'HEALTH',
    color: GREEN,
    icon: 'health',
    head: 'Measles returns to the US',
    body: 'US loses measles-free status after 26 years. Ebola passes 11,000 cases in DR Congo.',
  },
];

function draw(): Canvas {
  const cv = new Canvas(1024, 1024, INK);

  // Header: the date is the boldest thing on the page.
  cv.drawText('THE WORLD IN ONE IMAGE', 32, 34, 2, GOLD);
  cv.drawText('18 NOVEMBER 2026', 32, 64, 6, PAPER);
  cv.fillRect(32, 122, 960, 3, GOLD);
  cv.drawText('WEDNESDAY  -  THE DAY\'S WORLD NEWS', 32, 140, 2, MUTED);

  // Hero: the summit story, with a globe carrying three markers.
  cv.fillRect(32, 172, 960, 244, CARD);
  cv.rect(32, 172, 960, 244, CARD_LINE);
  cv.fillRect(32, 172, 8, 244, GOLD);
  cv.drawText('SUMMITS  -  SHENZHEN & MANILA', 64, 196, 2, GOLD);
  cv.paragraph('XI MEETS PUTIN IN SHENZHEN', 64, 228, 4, PAPER, 560, 36);
  cv.paragraph('TRUMP JOINS THEM THURSDAY', 64, 300, 3, PAPER, 560, 28);
  cv.paragraph(
    'APEC opens in China as the US, China and Russia head for their first three-way summit. The Quad meets in Manila.',
    64, 344, 2, MUTED, 560, 18,
  );
  // Globe.
  const gx = 830;
  const gy = 294;
  cv.fillCircle(gx, gy, 92, [16, 42, 74]);
  cv.circle(gx, gy, 92, GOLD);
  cv.circle(gx, gy, 92, GOLD);
  cv.ellipse(gx, gy, 92, 34, [24, 68, 110]);
  cv.ellipse(gx, gy, 34, 92, [24, 68, 110]);
  cv.ellipse(gx - 28, gy - 22, 30, 16, TEAL);
  cv.ellipse(gx + 30, gy + 18, 26, 14, TEAL);
  cv.ellipse(gx + 8, gy - 44, 18, 10, TEAL);
  cv.fillCircle(gx - 52, gy - 30, 6, RED);
  cv.fillCircle(gx + 48, gy - 34, 6, GOLD);
  cv.fillCircle(gx + 56, gy + 30, 6, BLUE);
  cv.drawText('US  CN  RU', gx - 48, gy + 104, 2, MUTED);

  // Story grid: 2 columns x 3 rows, colour-coded by region/beat.
  const cols = [32, 524];
  const rows = [436, 614, 792];
  STORIES.forEach((s, i) => {
    const x = cols[i % 2];
    const y = rows[Math.floor(i / 2)];
    cv.fillRect(x, y, 468, 164, CARD);
    cv.rect(x, y, 468, 164, CARD_LINE);
    cv.fillRect(x, y, 468, 5, s.color);
    cv.drawText(s.tag, x + 20, y + 22, 2, s.color);
    icon(cv, s.icon, x + 396, y + 16, s.color);
    cv.paragraph(s.head, x + 20, y + 52, 3, PAPER, 360, 26);
    cv.paragraph(s.body, x + 20, y + 106, 2, MUTED, 428, 17);
  });

  // Footer ticker: the day's other headlines, in one line.
  cv.fillRect(32, 972, 960, 3, CARD_LINE);
  cv.drawText(
    'GAZA: 950,000 DISPLACED PEOPLE FACE WINTER IN FLOOD-PRONE CAMPS - BRENT $91.55',
    32, 988, 2, MUTED,
  );
  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const png = draw().png();
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
