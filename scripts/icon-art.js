// ============================================================
// Arte del icono de la app, sin dependencias (encoder PNG propio + zlib).
// Diseño: cuadrado redondeado índigo con gráfica de barras blanca.
// Lo usan scripts/gen-icons.js (PWA) y scripts/gen-android-icons.js (APK).
// ============================================================
import { deflateSync } from 'node:zlib';

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

export function encodePNG(width, height, rgba) {
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

/** Color por coordenadas normalizadas (u, v) en [0,1]: icono completo. */
function iconColorAt(u, v) {
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

/** Color de las barras blancas sobre transparente, escaladas al centro. */
function barsColorAt(u, v, scale = 0.6) {
  const a = (u - 0.5) / scale + 0.5;
  const b = (v - 0.5) / scale + 0.5;
  const bars = [
    { cx: 0.30, top: 0.34 },
    { cx: 0.50, top: 0.52 },
    { cx: 0.70, top: 0.68 },
  ];
  const barW = 0.15;
  const barR = 0.055;
  for (const bar of bars) {
    if (inRoundRect(a, b, bar.cx - barW / 2, bar.top, bar.cx + barW / 2, 0.82, barR)) {
      return [255, 255, 255, 255];
    }
  }
  return [0, 0, 0, 0];
}

/** Render genérico con supersampling (bordes suaves). */
export function render(width, height, colorAt) {
  const SS = 4;
  const rgba = Buffer.alloc(width * height * 4);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / width;
          const v = (py + (sy + 0.5) / SS) / height;
          const [cr, cg, cb, ca] = colorAt(u, v);
          r += cr; g += cg; b += cb; a += ca;
        }
      }
      const n = SS * SS;
      const i = (py * width + px) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(width, height, rgba);
}

/** Icono cuadrado redondeado (PWA y respaldo del APK). */
export function renderIcon(size) {
  return render(size, size, iconColorAt);
}

/** Icono circular (ic_launcher_round de Android). */
export function renderRoundIcon(size) {
  return render(size, size, (u, v) => {
    const dx = u - 0.5;
    const dy = v - 0.5;
    if (dx * dx + dy * dy > 0.25) return [0, 0, 0, 0];
    return iconColorAt(u, v);
  });
}

/**
 * Capa frontal del icono adaptativo de Android (108dp): solo las barras
 * blancas sobre transparente, dentro de la zona segura. El fondo índigo lo
 * pone @color/ic_launcher_background.
 */
export function renderAdaptiveForeground(size) {
  return render(size, size, (u, v) => barsColorAt(u, v, 0.55));
}

/** Pantalla de arranque: fondo índigo con el icono centrado. */
export function renderSplash(width, height) {
  const side = Math.min(width, height) * 0.42;
  const x0 = (width - side) / 2;
  const y0 = (height - side) / 2;
  return render(width, height, (u, v) => {
    const px = u * width;
    const py = v * height;
    if (px >= x0 && px <= x0 + side && py >= y0 && py <= y0 + side) {
      const su = (px - x0) / side;
      const sv = (py - y0) / side;
      const c = iconColorAt(su, sv);
      if (c[3] === 0) return [79, 70, 229, 255]; // esquinas: mismo índigo del fondo
      return c;
    }
    return [79, 70, 229, 255];
  });
}
