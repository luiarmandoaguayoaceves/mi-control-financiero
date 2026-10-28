// Genera los iconos PNG de la PWA (192, 512 y apple-touch 180)
// sin dependencias: el arte y el encoder viven en scripts/icon-art.js.
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderIcon } from './icon-art.js';

mkdirSync('icons', { recursive: true });
for (const size of [512, 192, 180]) {
  const name = size === 180 ? 'icons/apple-touch-icon.png' : `icons/icon-${size}.png`;
  writeFileSync(name, renderIcon(size));
  console.log(`Generado ${name} (${size}x${size})`);
}
