// Genera los iconos PNG de la PWA (192, 512 y apple-touch 180)
// sin dependencias: encoder PNG propio + zlib de Node.
// Diseño: cuadrado redondeado índigo con gráfica de barras blanca.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---------- Encoder PNG ----------
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = 1 + width * 4;
  const rows = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    rows[y * stride] = 0; // filter none
    rgba.copy(rows, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(rows);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Dibujo ----------
// SDF de rectángulo redondeado
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  const qx = Math.max(x0 + r - x, 0) + Math.max(x - (x1 - r), 0);
  const qy = Math.max(y0 + r - y, 0) + Math.max(y - (y1 - r), 0);
  return qx * qx + qy * qy <= r * r;
}

// Color por coordenadas normalizadas (u, v) en [0,1]
function colorAt(u, v) {
  // Fondo: cuadrado redondeado con gradiente índigo
  if (!inRoundRect(u, v, 0, 0, 1, 1, 0.22)) return [0, 0, 0, 0];
  const t = v;
  const bg = [
    Math.round(79 + (49 - 79) * t),
    Math.round(70 + (46 - 70) * t),
    Math.round(229 + (129 - 229) * t),
  ];
  // Barras de gráfica (ancho 0.15, base 0.82)
  const bars = [
    { cx: 0.30, top: 0.34 },
    { cx: 0.50, top: 0.52 },
    { cx: 0.70, top: 0.68 },
  ];
  const barW = 0.15;
  const barR = 0.055;
  for (const b of bars) {
    if (inRoundRect(u, v, b.cx - barW / 2, b.top, b.cx + barW / 2, 0.82, barR)) {
      return [255, 255, 255, 245];
    }
  }
  return [bg[0], bg[1], bg[2], 255];
}

function renderIcon(size) {
  const SS = 4; // supersampling para suavizar bordes
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          const [cr, cg, cb, ca] = colorAt(u, v);
          r += cr; g += cg; b += cb; a += ca;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, rgba);
}

mkdirSync('icons', { recursive: true });
for (const size of [512, 192, 180]) {
  const name = size === 180 ? 'icons/apple-touch-icon.png' : `icons/icon-${size}.png`;
  writeFileSync(name, renderIcon(size));
  console.log(`Generado ${name} (${size}x${size})`);
}
