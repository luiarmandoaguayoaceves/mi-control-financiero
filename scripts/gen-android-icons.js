// ============================================================
// Genera los iconos y la pantalla de arranque del APK (Android).
// Se ejecuta después de `npx cap add android` (necesita android/app/src/main/res).
// Sin dependencias: el arte y el encoder viven en scripts/icon-art.js.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { renderIcon, renderRoundIcon, renderAdaptiveForeground, renderSplash } from './icon-art.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Densidades: sufijo de carpeta -> factor respecto a mdpi
const DENSITIES = [
  { dir: 'mdpi', scale: 1 },
  { dir: 'hdpi', scale: 1.5 },
  { dir: 'xhdpi', scale: 2 },
  { dir: 'xxhdpi', scale: 3 },
  { dir: 'xxxhdpi', scale: 4 },
];

function write(dir, name, buffer) {
  const target = path.join(RES, dir);
  mkdirSync(target, { recursive: true });
  const file = path.join(target, name);
  writeFileSync(file, buffer);
  console.log(`  ${path.relative(ROOT, file)}`);
}

console.log('Iconos de lanzamiento (legacy 48dp + adaptativo 108dp):');
for (const { dir, scale } of DENSITIES) {
  const legacy = Math.round(48 * scale);
  write(`mipmap-${dir}`, 'ic_launcher.png', renderIcon(legacy));
  write(`mipmap-${dir}`, 'ic_launcher_round.png', renderRoundIcon(legacy));
  write(`mipmap-${dir}`, 'ic_launcher_foreground.png', renderAdaptiveForeground(Math.round(108 * scale)));
}

console.log('Pantallas de arranque (vertical y horizontal):');
const SPLASH = {
  mdpi: { port: [320, 480], land: [480, 320] },
  hdpi: { port: [480, 800], land: [800, 480] },
  xhdpi: { port: [720, 1280], land: [1280, 720] },
  xxhdpi: { port: [960, 1600], land: [1600, 960] },
  xxxhdpi: { port: [1280, 1920], land: [1920, 1280] },
};
for (const [dir, sizes] of Object.entries(SPLASH)) {
  const [pw, ph] = sizes.port;
  const [lw, lh] = sizes.land;
  write(`drawable-port-${dir}`, 'splash.png', renderSplash(pw, ph));
  write(`drawable-land-${dir}`, 'splash.png', renderSplash(lw, lh));
}
write('drawable', 'splash.png', renderSplash(480, 800));

console.log('Listo: vuelve a compilar el APK para ver los iconos nuevos.');
